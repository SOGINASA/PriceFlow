"""Загрузка архива прайсов и статус обработки (ТЗ 4.1, 4.6).

POST /api/archives            — загрузить ZIP, поставить документы в очередь
GET  /api/archives/{doc_id}   — статус конкретного документа
GET  /api/archives            — список документов с фильтром по статусу
"""
import os
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify

from config import Config
from models import db, PriceDocument, ParseStatus
from services.archive_service import ingest_archive, ingest_files

logger = logging.getLogger(__name__)
upload_bp = Blueprint('archives', __name__)


@upload_bp.route('', methods=['POST'])
def upload_archive():
    """Принять прайсы: ZIP-архив(ы) в поле 'file' и/или отдельные файлы в поле 'files'.

    Можно слать несколько ZIP и совмещать оба поля в одном запросе. Не-zip,
    ошибочно присланный в 'file', обрабатывается как обычный прайс.

    Query: sync=1 — обработать синхронно (без Celery/Redis, удобно для демо).
    """
    enqueue = request.args.get('sync') != '1'

    # Явная клиника/город из формы (опционально). Если не заданы — клиника
    # определяется по имени файла (см. archive_service).
    partner_name = (request.form.get('partner_name') or '').strip() or None
    city = (request.form.get('city') or '').strip() or None

    file_field = [fs for fs in request.files.getlist('file') if fs and fs.filename]
    loose = [fs for fs in request.files.getlist('files') if fs and fs.filename]
    zips = [fs for fs in file_field if fs.filename.lower().endswith('.zip')]
    loose += [fs for fs in file_field if not fs.filename.lower().endswith('.zip')]

    if not zips and not loose:
        return jsonify({'error': "Ожидается ZIP в поле 'file' или файлы в поле 'files'"}), 400

    doc_ids, sources = [], []
    os.makedirs(Config.ARCHIVE_DIR, exist_ok=True)
    stamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    for i, zf in enumerate(zips):
        # префикс i защищает от коллизии имён, если в секунду пришло несколько архивов
        saved = os.path.join(Config.ARCHIVE_DIR, f"{stamp}_{i}_{zf.filename}")
        zf.save(saved)
        doc_ids += ingest_archive(saved, enqueue=enqueue,
                                  partner_name=partner_name, city=city)
        sources.append(zf.filename)
    if loose:
        doc_ids += ingest_files(loose, enqueue=enqueue,
                                partner_name=partner_name, city=city)
        sources.append(f'{len(loose)} файл(ов)')

    if not doc_ids:
        return jsonify({'source': ', '.join(sources), 'documents': 0, 'doc_ids': [],
                        'warning': 'В загруженном не найдено поддерживаемых прайсов'}), 201

    if not enqueue:  # синхронная обработка для dev/демо
        from services.tasks import process_document_sync
        for doc_id in doc_ids:
            process_document_sync(doc_id)

        # Авто-формирование справочника (ТЗ §7) — ОДИН раз на всю загрузку, а не на
        # каждый документ, чтобы не держать долгую запись (SQLite lock).
        if Config.AUTO_BUILD_CATALOG:
            try:
                from services import catalog_service
                catalog_service.build_catalog_from_items(
                    threshold=Config.CATALOG_CLUSTER_THRESHOLD, only_unmatched=True)
            except Exception as e:  # noqa: BLE001 — не ронять ответ загрузки
                logger.warning('auto catalog build skipped: %s', e)

    return jsonify({'source': ', '.join(sources), 'documents': len(doc_ids), 'doc_ids': doc_ids}), 201


@upload_bp.route('', methods=['GET'])
def list_documents():
    status = request.args.get('status')
    q = PriceDocument.query
    if status:
        q = q.filter_by(parse_status=status)
    docs = q.order_by(PriceDocument.created_at.desc()).limit(500).all()
    return jsonify([d.to_dict() for d in docs])


@upload_bp.route('/<doc_id>', methods=['GET'])
def document_status(doc_id):
    doc = db.session.get(PriceDocument, doc_id)
    if not doc:
        return jsonify({'error': 'Документ не найден'}), 404
    data = doc.to_dict(include_raw=request.args.get('raw') == '1')
    data['items_count'] = doc.items.count()
    return jsonify(data)
