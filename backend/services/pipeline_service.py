"""Оркестрация обработки одного документа (ТЗ 4.1–4.4).

extract → validate → save items → normalize → anomaly check → set status.
Вызывается из Celery-таски (services.tasks) или синхронно (dev/тесты).
"""
import logging
from datetime import datetime, timezone

from models import (
    db, PriceDocument, PriceItem, ParseStatus, FileFormat, Currency,
)
from services.extractors import get_extractor
from services import normalization_service as norm
from services import validation_service as val
from services import currency_service as fx

logger = logging.getLogger(__name__)


def process_document(doc_id: str):
    """Полный конвейер обработки одного PriceDocument."""
    doc = db.session.get(PriceDocument, doc_id)
    if not doc:
        logger.error('Документ %s не найден', doc_id)
        return

    doc.parse_status = ParseStatus.PROCESSING
    db.session.commit()

    log = []
    try:
        result = _extract_with_ocr_fallback(doc, log)
        doc.raw_content = (result.raw_text or '')[:1_000_000]
        log.extend(result.warnings)

        if not result.rows:
            doc.parse_status = ParseStatus.ERROR
            log.append('Документ не содержит распознаваемых данных')
            _finish(doc, log)
            return

        val.validate_effective_date(doc.effective_date, log)
        index = norm._build_index()
        auto_matched = 0

        for row in result.rows:
            if not val.validate_row(row, doc.effective_date, log):
                continue
            item = _build_item(doc, row)
            _supersede_previous(item, log)
            db.session.add(item)
            db.session.flush()
            if norm.normalize_item(item, index):
                auto_matched += 1

        # статус: needs_review, если что-то не нормализовалось/есть предупреждения
        total = len([r for r in result.rows])
        doc.parse_status = (
            ParseStatus.NEEDS_REVIEW if (auto_matched < total or log) else ParseStatus.DONE
        )
        log.append(f'Извлечено {total}, автосопоставлено {auto_matched}')
        _finish(doc, log)
        # Авто-формирование справочника вынесено на УРОВЕНЬ ПАКЕТА загрузки
        # (routes/upload), чтобы не перестраивать справочник на каждый документ
        # и не держать долгую запись (иначе SQLite «database is locked»).
    except Exception as e:  # noqa: BLE001
        logger.exception('pipeline failed for %s', doc_id)
        db.session.rollback()
        doc = db.session.get(PriceDocument, doc_id)
        doc.parse_status = ParseStatus.ERROR
        log.append(f'Критическая ошибка обработки: {e}')
        _finish(doc, log)


def _extract_with_ocr_fallback(doc, log):
    """Текстовый PDF без текста → переключаемся на OCR (скан)."""
    result = get_extractor(doc.file_format)(doc.file_path)
    if doc.file_format == FileFormat.PDF and not result.raw_text.strip():
        log.append('Текст не извлечён — повтор через OCR (scan_pdf)')
        doc.file_format = FileFormat.SCAN_PDF
        result = get_extractor(FileFormat.SCAN_PDF)(doc.file_path)
    return result


def _build_item(doc, row) -> PriceItem:
    # Валюта не KZT → пересчёт по курсу на дату прайса, оригинал сохраняем (ТЗ 4.4).
    currency = row.currency or Currency.KZT
    return PriceItem(
        doc_id=doc.doc_id,
        partner_id=doc.partner_id,
        service_name_raw=row.service_name_raw,
        service_code_source=row.service_code_source,
        price_resident_kzt=fx.convert_to_kzt(row.price_resident, currency, doc.effective_date),
        price_nonresident_kzt=fx.convert_to_kzt(row.price_nonresident, currency, doc.effective_date),
        price_original=row.price_resident,           # цена в исходной валюте (резидентская)
        currency_original=currency,
        effective_date=doc.effective_date,
        is_active=True,
    )


def _supersede_previous(item, log):
    """Дедуп/версионирование: та же клиника+услуга — архивировать старую активную."""
    prev = (PriceItem.query
            .filter_by(partner_id=item.partner_id,
                       service_name_raw=item.service_name_raw,
                       is_active=True)
            .order_by(PriceItem.created_at.desc())
            .first())
    if prev:
        val.check_price_anomaly(item, prev, log)
        val.archive_and_supersede(prev, reason='superseded_by_new_document')


def _finish(doc, log):
    doc.parsed_at = datetime.now(timezone.utc)
    doc.parse_log = '\n'.join(log)
    db.session.commit()
