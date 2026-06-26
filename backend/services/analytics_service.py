"""Аналитика цен по справочнику услуг (анализ — ТЗ 4.5/4.6).

Чистые SQL-выборки + агрегация в Python. Без ML и без зависимостей от диалекта
БД (медиана/перцентили считаются в Python, поэтому работает и на SQLite, и на
PostgreSQL). Везде учитываются только актуальные позиции (is_active=True).
"""
from datetime import date
from typing import Optional

from models import db, Service, Partner, PriceItem, PriceItemHistory


def _f(v) -> Optional[float]:
    """Numeric/Decimal -> float | None."""
    return float(v) if v is not None else None


def _stats(prices):
    """Сводка по списку цен: count/min/max/avg/median/spread. Пустой список -> нули."""
    vals = sorted(p for p in prices if p is not None)
    n = len(vals)
    if not n:
        return {'count': 0, 'min': None, 'max': None, 'avg': None,
                'median': None, 'spread_ratio': None}
    mid = n // 2
    median = vals[mid] if n % 2 else (vals[mid - 1] + vals[mid]) / 2
    mn, mx = vals[0], vals[-1]
    return {
        'count': n,
        'min': round(mn, 2),
        'max': round(mx, 2),
        'avg': round(sum(vals) / n, 2),
        'median': round(median, 2),
        # во сколько раз самая дорогая дороже самой дешёвой (разброс рынка)
        'spread_ratio': round(mx / mn, 2) if mn else None,
    }


def _active_items_with_partner(service_id):
    """Актуальные позиции услуги вместе с клиникой, отсортированы по цене резидента."""
    return (db.session.query(PriceItem, Partner)
            .join(Partner, Partner.partner_id == PriceItem.partner_id)
            .filter(PriceItem.service_id == service_id, PriceItem.is_active.is_(True))
            .order_by(PriceItem.price_resident_kzt.asc())
            .all())


def compare_service_prices(service_id: str):
    """П.1 — сравнение цены услуги между клиниками + сводная статистика.

    Возвращает {service, offers[], summary, cheapest, most_expensive} или None,
    если услуги нет в справочнике.
    """
    svc = db.session.get(Service, service_id)
    if not svc:
        return None

    rows = _active_items_with_partner(service_id)
    offers = []
    for item, partner in rows:
        offers.append({
            'partner_id': partner.partner_id,
            'partner_name': partner.name,
            'city': partner.city,
            'price_resident_kzt': _f(item.price_resident_kzt),
            'price_nonresident_kzt': _f(item.price_nonresident_kzt),
            'effective_date': item.to_dict()['effective_date'],
            'is_verified': item.is_verified,
            'has_anomaly': item.has_anomaly,
        })

    priced = [o for o in offers if o['price_resident_kzt'] is not None]
    summary = _stats([o['price_resident_kzt'] for o in priced])

    return {
        'service': svc.to_dict(),
        'offers': offers,
        'summary': summary,
        # offers уже отсортированы по возрастанию цены резидента
        'cheapest': priced[0] if priced else None,
        'most_expensive': priced[-1] if priced else None,
    }


def service_prices_by_city(service_id: str):
    """П.2 — срез цен услуги по городам (среднее/медиана/кол-во клиник)."""
    svc = db.session.get(Service, service_id)
    if not svc:
        return None

    by_city = {}
    for item, partner in _active_items_with_partner(service_id):
        price = _f(item.price_resident_kzt)
        if price is None:
            continue
        by_city.setdefault(partner.city or 'Не указан', []).append(price)

    cities = [{'city': city, **_stats(prices)} for city, prices in by_city.items()]
    cities.sort(key=lambda c: (c['median'] if c['median'] is not None else float('inf')))
    return {'service': svc.to_dict(), 'cities': cities}


def service_price_trend(service_id: str, partner_id: str = None):
    """П.3 — динамика цены услуги во времени (текущие позиции + архив истории).

    Объединяет PriceItem (актуальные) и PriceItemHistory (архивные значения) по
    effective_date и усредняет цену на каждую дату. partner_id сужает до клиники.
    Возвращает ряд точек, отсортированный по дате.
    """
    svc = db.session.get(Service, service_id)
    if not svc:
        return None

    # актуальные позиции
    cur_q = PriceItem.query.filter(PriceItem.service_id == service_id,
                                   PriceItem.is_active.is_(True))
    if partner_id:
        cur_q = cur_q.filter(PriceItem.partner_id == partner_id)
    current = [(i.effective_date, _f(i.price_resident_kzt)) for i in cur_q.all()]

    # архивные значения цены (через item -> history)
    hist_q = (db.session.query(PriceItemHistory.effective_date,
                               PriceItemHistory.price_resident_kzt)
              .join(PriceItem, PriceItem.item_id == PriceItemHistory.item_id)
              .filter(PriceItem.service_id == service_id))
    if partner_id:
        hist_q = hist_q.filter(PriceItem.partner_id == partner_id)
    history = [(d, _f(p)) for d, p in hist_q.all()]

    by_date = {}
    for d, price in current + history:
        if d is None or price is None:
            continue
        by_date.setdefault(d, []).append(price)

    points = [{
        'date': d.isoformat() if isinstance(d, date) else str(d),
        'avg_price_kzt': round(sum(v) / len(v), 2),
        'min_price_kzt': round(min(v), 2),
        'max_price_kzt': round(max(v), 2),
        'samples': len(v),
    } for d, v in sorted(by_date.items())]

    return {'service': svc.to_dict(), 'partner_id': partner_id, 'points': points}


def list_anomalies(limit: int = 200):
    """П.4 — отчёт по аномалиям цен: позиция, клиника, предыдущая цена и % отклонения."""
    rows = (db.session.query(PriceItem, Partner)
            .join(Partner, Partner.partner_id == PriceItem.partner_id)
            .filter(PriceItem.is_active.is_(True), PriceItem.has_anomaly.is_(True))
            .order_by(PriceItem.effective_date.desc())
            .limit(limit).all())

    out = []
    for item, partner in rows:
        # последняя архивная цена этой позиции — для расчёта отклонения
        prev = (PriceItemHistory.query
                .filter_by(item_id=item.item_id)
                .order_by(PriceItemHistory.archived_at.desc())
                .first())
        cur = _f(item.price_resident_kzt)
        prev_price = _f(prev.price_resident_kzt) if prev else None
        deviation = None
        if cur is not None and prev_price:
            deviation = round((cur - prev_price) / prev_price * 100, 1)

        out.append({
            'item_id': item.item_id,
            'service_id': item.service_id,
            'service_name_raw': item.service_name_raw,
            'partner_name': partner.name,
            'city': partner.city,
            'current_price_kzt': cur,
            'previous_price_kzt': prev_price,
            'deviation_pct': deviation,
            'effective_date': item.to_dict()['effective_date'],
            'is_verified': item.is_verified,
        })
    return {'count': len(out), 'anomalies': out}


def price_summary_for_service(service_id: str):
    """Краткая сводка для обогащения поиска (П.5): {min, max, clinics_count}."""
    prices = [
        _f(i.price_resident_kzt)
        for i in PriceItem.query.filter(PriceItem.service_id == service_id,
                                        PriceItem.is_active.is_(True)).all()
    ]
    s = _stats(prices)
    return {'min': s['min'], 'max': s['max'], 'clinics_count': s['count']}
