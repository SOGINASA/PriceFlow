"""Восстановление «застрявших» документов (ТЗ 4.1 — очередь со статусами).

Документ может остаться в незавершённом статусе, если синхронная обработка
прервалась посередине (например, при конкурентной записи в SQLite — «database is
locked»): pending (так и не начался), processing (начался и не завершился), error
(упал с ошибкой). Их позиции/аномалии в очереди верификации не появляются.

Скрипт находит такие документы, удаляет их частично записанные позиции (чтобы
переобработка не плодила дубликаты) и прогоняет конвейер заново. В конце —
переоформление справочника, как при обычной загрузке (routes/upload).

Запуск (бэкенд должен быть ОСТАНОВЛЕН, иначе снова поймаем лок):
    python recover_stuck.py            — переобработать pending/processing/error
    python recover_stuck.py --status error processing   — только указанные статусы
    python recover_stuck.py --dry-run  — показать, что будет сделано, без записи
"""
import argparse
import sys

from config import Config
from models import db, PriceDocument, PriceItem, PriceItemHistory, ParseStatus

STUCK_DEFAULT = [ParseStatus.PENDING, ParseStatus.PROCESSING, ParseStatus.ERROR]


def _delete_items_of(doc_id: str) -> int:
    """Удалить позиции документа и их историю (частичный результат прерванного прогона)."""
    items = PriceItem.query.filter_by(doc_id=doc_id).all()
    for it in items:
        PriceItemHistory.query.filter_by(item_id=it.item_id).delete(synchronize_session=False)
        db.session.delete(it)
    return len(items)


def recover(statuses, dry_run=False):
    from services.tasks import process_document_sync

    docs = (PriceDocument.query
            .filter(PriceDocument.parse_status.in_(statuses))
            .order_by(PriceDocument.created_at.asc())
            .all())
    if not docs:
        print('[recover] застрявших документов нет.')
        return

    print(f'[recover] найдено документов: {len(docs)}')
    for doc in docs:
        print(f'  - {doc.parse_status:11} {doc.file_name}  ({doc.doc_id})')

    if dry_run:
        print('[recover] dry-run: изменения не вносятся.')
        return

    ok = err = 0
    for doc in docs:
        doc_id, name = doc.doc_id, doc.file_name
        removed = _delete_items_of(doc_id)
        doc.parse_status = ParseStatus.PENDING
        doc.parse_log = None
        doc.parsed_at = None
        db.session.commit()
        if removed:
            print(f'[recover] {name}: удалено старых позиций {removed}, переобработка…')
        else:
            print(f'[recover] {name}: переобработка…')

        process_document_sync(doc_id)

        doc = db.session.get(PriceDocument, doc_id)
        status = doc.parse_status
        cnt = doc.items.count()
        print(f'[recover]   → {status}, позиций {cnt}')
        if status == ParseStatus.ERROR:
            err += 1
        else:
            ok += 1

    # Переоформление справочника один раз на весь прогон (как routes/upload).
    if Config.AUTO_BUILD_CATALOG:
        try:
            from services import catalog_service
            catalog_service.build_catalog_from_items(
                threshold=Config.CATALOG_CLUSTER_THRESHOLD, only_unmatched=True)
            print('[recover] справочник переоформлен.')
        except Exception as e:  # noqa: BLE001
            print(f'[recover] справочник пропущен: {e}')

    print(f'[recover] готово: успешно {ok}, с ошибкой {err}.')


def _parse_statuses(values):
    valid = {ParseStatus.PENDING, ParseStatus.PROCESSING, ParseStatus.ERROR,
             ParseStatus.NEEDS_REVIEW, ParseStatus.DONE}
    out = []
    for v in values:
        if v not in valid:
            print(f'[recover] неизвестный статус: {v} (допустимо: {sorted(valid)})')
            sys.exit(2)
        out.append(v)
    return out


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Переобработать застрявшие документы.')
    ap.add_argument('--status', nargs='+', metavar='STATUS',
                    help='Статусы для переобработки (по умолчанию: pending processing error)')
    ap.add_argument('--dry-run', action='store_true', help='Показать план без записи')
    args = ap.parse_args()

    statuses = _parse_statuses(args.status) if args.status else STUCK_DEFAULT

    from app import create_app
    app = create_app()
    with app.app_context():
        recover(statuses, dry_run=args.dry_run)
