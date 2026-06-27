"""Оркестрация обработки одного документа (ТЗ 4.1–4.4).

extract → validate → save items → normalize → anomaly check → set status.
Вызывается из Celery-таски (services.tasks) или синхронно (dev/тесты).
"""
import re
import logging
from datetime import datetime, timezone, date

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

        # Дата прайса из содержимого, если её не было в имени файла (ТЗ 2.1 / 4.4).
        if doc.effective_date is None:
            found = _guess_date_from_text(result.raw_text)
            if found:
                doc.effective_date = found
                log.append(f'Дата прайса определена из содержимого: {found}')

        if not result.rows:
            doc.parse_status = ParseStatus.ERROR
            log.append('Документ не содержит распознаваемых данных')
            _finish(doc, log)
            return

        val.validate_effective_date(doc.effective_date, log)
        index = norm._build_index()

        # Прогреваем семантику (загрузка модели + эмбеддинги справочника) и
        # коммитим метаданные документа ДО цикла вставки. Иначе первая же позиция
        # тянет загрузку модели на десятки секунд под уже открытым BEGIN IMMEDIATE,
        # лок записи висит дольше busy_timeout, и параллельные запросы (поллинг
        # статуса, следующий документ пакета) валятся с "database is locked".
        # commit здесь же снимает read-лок прогрева — пишущую транзакцию открываем
        # только на сам цикл записи позиций, держим её минимально.
        norm.warm_semantic_cache(index)
        db.session.commit()

        auto_matched = 0

        for row in result.rows:
            if not val.validate_row(row, doc.effective_date, log):
                continue
            item = _build_item(doc, row)
            val.flag_resident_order(item, log)   # нерезидент < резидент → флаг ревью
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


# Поиск даты прайса в тексте документа (шапка прайса, «от 01.03.2025»).
# Берём только полные даты с 4-значным годом, чтобы не цеплять номера/цены.
_RU_MONTHS = {
    'январ': 1, 'феврал': 2, 'март': 3, 'апрел': 4, 'мая': 5, 'май': 5, 'июн': 6,
    'июл': 7, 'август': 8, 'сентябр': 9, 'октябр': 10, 'ноябр': 11, 'декабр': 12,
}
_DMY_RE = re.compile(r'\b(\d{1,2})[.\-/](\d{1,2})[.\-/](20\d{2})\b')          # 01.03.2025
_YMD_RE = re.compile(r'\b(20\d{2})[.\-/](\d{1,2})[.\-/](\d{1,2})\b')          # 2025-03-01
_RU_RE = re.compile(r'\b(\d{1,2})\s+([а-яё]{3,})\s+(20\d{2})', re.IGNORECASE)  # 1 марта 2025


def _plausible(d: date):
    """Дата правдоподобна как дата прайса: не в будущем и не древняя."""
    return d and date(2015, 1, 1) <= d <= date.today()


def _guess_date_from_text(raw_text: str):
    """Извлечь дату прайса из шапки документа. Возвращает date или None.

    Смотрим начало текста (где обычно стоит дата прайса) и берём первую
    правдоподобную дату в форматах ДД.ММ.ГГГГ, ГГГГ-ММ-ДД или «1 марта 2025»."""
    if not raw_text:
        return None
    head = raw_text[:2000]
    candidates = []
    for d, m, y in _DMY_RE.findall(head):
        candidates.append(_safe_date(int(y), int(m), int(d)))
    for y, m, d in _YMD_RE.findall(head):
        candidates.append(_safe_date(int(y), int(m), int(d)))
    for d, mon, y in _RU_RE.findall(head):
        month = next((num for stem, num in _RU_MONTHS.items() if mon.lower().startswith(stem)), None)
        if month:
            candidates.append(_safe_date(int(y), month, int(d)))
    valid = [c for c in candidates if _plausible(c)]
    return valid[0] if valid else None


def _safe_date(y, m, d):
    try:
        return date(y, m, d)
    except ValueError:
        return None


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
    """Дедуп/версионирование (ТЗ 4.4): та же клиника+услуга — архивировать старую
    активную. Та же дата → дубликат; другая дата → новая версия цены."""
    prev = (PriceItem.query
            .filter_by(partner_id=item.partner_id,
                       service_name_raw=item.service_name_raw,
                       is_active=True)
            .order_by(PriceItem.created_at.desc())
            .first())
    if prev:
        val.check_price_anomaly(item, prev, log)
        same_date = prev.effective_date == item.effective_date
        reason = 'duplicate_same_date' if same_date else 'superseded_price_version'
        val.archive_and_supersede(prev, reason=reason)


def _finish(doc, log):
    doc.parsed_at = datetime.now(timezone.utc)
    doc.parse_log = '\n'.join(log)
    db.session.commit()
