"""Конвертация валют по курсу на дату прайса (ТЗ 4.4).

Правило ТЗ 4.4: «Валюта не KZT → конвертировать по курсу на дату прайса,
сохранить оригинал». Поэтому пересчёт всегда привязан к дате прайса
(effective_date), а не к текущему курсу.

Курсы хранятся в таблице exchange_rates (валюта + дата). Для конкретной даты
берём курс на эту дату или ближайший предшествующий — курс НБ РК действует до
следующей публикации. Если по валюте в БД нет ни одной записи, используется
статический фолбэк STATIC_FALLBACK, чтобы конвертация работала офлайн
(демо/тесты без доступа к API Нацбанка).

Источник «живых» курсов — Нацбанк РК (XML/RSS). Сетевой вызов выполняется
лениво и только если включён Config.FX_AUTO_FETCH, либо явно через
refresh_rates()/routes.rates — чтобы парсинг прайсов не зависел от сети.
"""
import logging
import xml.etree.ElementTree as ET
from datetime import date, timedelta

from config import Config
from models import db, ExchangeRate, Currency

logger = logging.getLogger(__name__)

# Фолбэк-курсы (1 ед. валюты в KZT), если в БД пусто и нет доступа к НБ РК.
STATIC_FALLBACK = {Currency.KZT: 1.0, Currency.USD: 470.0, Currency.RUB: 5.2}

# НБ РК отдаёт курсы на дату в формате RSS/XML: ?fdate=DD.MM.YYYY
NBK_RATES_URL = 'https://nationalbank.kz/rss/get_rates.cfm'


# ---------------------------------------------------------------------------
# Чтение курса и конвертация
# ---------------------------------------------------------------------------
def get_rate(currency: str, on_date: date = None) -> float:
    """Курс 1 ед. `currency` в KZT на дату `on_date` (ТЗ 4.4).

    Порядок: курс из БД на дату/ближайшую предшествующую → (опц.) подтянуть из
    НБ РК, если включён FX_AUTO_FETCH → статический фолбэк. Всегда возвращает
    число (для KZT и неизвестной валюты — 1.0).
    """
    if not currency or currency == Currency.KZT:
        return 1.0

    rate = _lookup(currency, on_date)
    if rate is None and getattr(Config, 'FX_AUTO_FETCH', False):
        try:
            fetch_and_store(on_date or date.today())
            rate = _lookup(currency, on_date)
        except Exception as e:  # noqa: BLE001 — сеть не должна ронять парсинг
            logger.warning('NBK fetch failed for %s on %s: %s', currency, on_date, e)
    if rate is None:
        rate = STATIC_FALLBACK.get(currency)
    return float(rate) if rate is not None else 1.0


def convert_to_kzt(amount, currency: str, on_date: date = None):
    """Пересчёт суммы в KZT по курсу на дату прайса. Оригинал сохраняется
    вызывающим кодом отдельно (price_original / currency_original)."""
    if amount is None:
        return None
    return round(float(amount) * get_rate(currency, on_date), 2)


def _lookup(currency: str, on_date: date):
    """Найти курс по валюте: на дату или ближайший предшествующий. Если прайс
    старше всех известных курсов — берём самый ранний доступный."""
    q = ExchangeRate.query.filter_by(currency=currency)
    if on_date is not None:
        row = (q.filter(ExchangeRate.date <= on_date)
                .order_by(ExchangeRate.date.desc())
                .first())
        if row is None:
            row = q.order_by(ExchangeRate.date.asc()).first()
    else:
        row = q.order_by(ExchangeRate.date.desc()).first()
    return float(row.rate) if row else None


# ---------------------------------------------------------------------------
# Запись / обновление курсов
# ---------------------------------------------------------------------------
def upsert_rate(currency: str, on_date: date, rate: float, source: str = 'manual') -> bool:
    """Создать/обновить курс на дату. True — добавлена новая запись."""
    row = ExchangeRate.query.filter_by(currency=currency, date=on_date).first()
    if row:
        row.rate = rate
        row.source = source
        return False
    db.session.add(ExchangeRate(currency=currency, date=on_date, rate=rate, source=source))
    return True


def fetch_and_store(on_date: date) -> int:
    """Подтянуть курсы USD/RUB из НБ РК на дату и сохранить. Возвращает число
    новых записей. Требует сети; бросает исключение при ошибке."""
    import requests
    url = f'{NBK_RATES_URL}?fdate={on_date.strftime("%d.%m.%Y")}'
    resp = requests.get(url, timeout=10)
    resp.raise_for_status()
    stored = 0
    for currency, rate in _parse_nbk_xml(resp.content):
        if upsert_rate(currency, on_date, rate, source='nbk'):
            stored += 1
    db.session.commit()
    return stored


def _parse_nbk_xml(content):
    """Распарсить RSS НБ РК → [(currency, rate_per_unit), ...] для USD/RUB.

    Курс в <description> дан за <quant> единиц (например, RUB часто за 10),
    поэтому нормализуем к курсу за 1 единицу.
    """
    out = []
    root = ET.fromstring(content)
    for item in root.iter('item'):
        title = (item.findtext('title') or '').strip().upper()
        if title not in (Currency.USD, Currency.RUB):
            continue
        desc = (item.findtext('description') or '').replace(',', '.').strip()
        quant = (item.findtext('quant') or '1').strip() or '1'
        try:
            rate = float(desc) / float(quant)
        except (ValueError, ZeroDivisionError):
            continue
        out.append((title, round(rate, 6)))
    return out


def refresh_rates(start: date, end: date = None, currencies=None) -> dict:
    """Подтянуть курсы НБ РК за диапазон дат [start, end]. По умолчанию end=start.

    Возвращает {'days': N, 'stored': M, 'errors': [...]}. Сетевые ошибки по
    отдельным дням не прерывают цикл.
    """
    end = end or start
    days, stored, errors = 0, 0, []
    cur = start
    while cur <= end:
        days += 1
        try:
            stored += fetch_and_store(cur)
        except Exception as e:  # noqa: BLE001
            errors.append(f'{cur.isoformat()}: {e}')
        cur += timedelta(days=1)
    return {'days': days, 'stored': stored, 'errors': errors}


def seed_fallback_rates(on_date: date = None) -> int:
    """Засеять статические курсы как baseline на дату (для офлайн-демо). Чтобы
    _lookup всегда находил запись по валюте. Идемпотентно (upsert)."""
    on_date = on_date or date(2024, 1, 1)
    added = 0
    for currency, rate in STATIC_FALLBACK.items():
        if currency == Currency.KZT:
            continue
        if upsert_rate(currency, on_date, rate, source='fallback'):
            added += 1
    db.session.commit()
    return added
