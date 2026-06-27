"""Валидация и верификация позиций прайса (ТЗ 4.4).

Проверки выполняются при парсинге. Каждая проблема пишется в лог документа,
часть переводит документ/позицию в needs_review или помечает аномалию.
"""
import logging
from datetime import date

from config import Config
from models import db, PriceItem, PriceItemHistory
from services.currency_service import convert_to_kzt  # noqa: F401 — реэкспорт для совместимости

logger = logging.getLogger(__name__)

# Конвертация валют вынесена в services.currency_service (курс на дату прайса,
# таблица exchange_rates, фолбэк НБ РК). convert_to_kzt реэкспортируется выше,
# чтобы существующие вызовы val.convert_to_kzt продолжали работать.


def validate_row(row, effective_date: date, log: list) -> bool:
    """Проверить сырую строку перед сохранением. False → строку пропускаем."""
    # Название услуги не пустое → иначе пропуск
    if not row.service_name_raw or not row.service_name_raw.strip():
        log.append('Пропущена строка: пустое название услуги')
        return False
    # Цена > 0 и число
    if row.price_resident is not None and row.price_resident <= 0:
        log.append(f'Некорректная цена резидента ({row.price_resident}) — needs_review: {row.service_name_raw}')
        row.price_resident = None
    # Нерезидент >= резидент
    if (row.price_resident is not None and row.price_nonresident is not None
            and row.price_nonresident < row.price_resident):
        log.append(f'Цена нерезидента < резидента — флаг ревью: {row.service_name_raw}')
    return True


def flag_resident_order(item: PriceItem, log: list) -> bool:
    """Цена нерезидента < цены резидента → пометить позицию как аномалию (ТЗ 4.4).

    «Предупреждение, флаг для ревью»: ставим has_anomaly, чтобы позиция попала в
    очередь /needs-review, а не только в лог документа."""
    res, nonres = item.price_resident_kzt, item.price_nonresident_kzt
    if res is not None and nonres is not None and float(nonres) < float(res):
        item.has_anomaly = True
        log.append(f'Цена нерезидента < резидента — флаг ревью: {item.service_name_raw}')
        return True
    return False


def check_price_anomaly(item: PriceItem, previous: PriceItem, log: list) -> bool:
    """Отклонение цены от предыдущей версии > порога → аномалия (ТЗ 4.4)."""
    if not previous or previous.price_resident_kzt in (None, 0) or item.price_resident_kzt is None:
        return False
    prev = float(previous.price_resident_kzt)
    cur = float(item.price_resident_kzt)
    if abs(cur - prev) / prev > Config.PRICE_ANOMALY_PCT:
        item.has_anomaly = True
        log.append(f'Аномалия цены ({prev}→{cur}) требует подтверждения: {item.service_name_raw}')
        return True
    return False


def archive_and_supersede(old_item: PriceItem, reason: str):
    """Версионирование: архивировать старую цену, деактивировать позицию (ТЗ 4.4)."""
    db.session.add(PriceItemHistory(
        item_id=old_item.item_id,
        price_resident_kzt=old_item.price_resident_kzt,
        price_nonresident_kzt=old_item.price_nonresident_kzt,
        effective_date=old_item.effective_date,
        reason=reason,
    ))
    old_item.is_active = False


def validate_effective_date(effective_date: date, log: list):
    """Дата прайса не в будущем (ТЗ 4.4) → предупреждение."""
    if effective_date and effective_date > date.today():
        log.append(f'Дата прайса в будущем: {effective_date}')
