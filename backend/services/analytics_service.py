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


def partner_price_aggregates(partner_ids=None):
    """Агрегаты прайса по клиникам для карточек: число позиций и минимальная цена.

    Возвращает {partner_id: {'services_count': int, 'min_price_kzt': float|None}}
    по актуальным позициям (is_active=True). partner_ids сужает выборку.
    """
    q = (db.session.query(
            PriceItem.partner_id,
            db.func.count(PriceItem.item_id),
            db.func.min(PriceItem.price_resident_kzt))
         .filter(PriceItem.is_active.is_(True)))
    if partner_ids is not None:
        ids = list(partner_ids)
        if not ids:
            return {}
        q = q.filter(PriceItem.partner_id.in_(ids))
    q = q.group_by(PriceItem.partner_id)
    return {pid: {'services_count': cnt, 'min_price_kzt': _f(mn)}
            for pid, cnt, mn in q.all()}


def price_summary_for_service(service_id: str):
    """Краткая сводка для обогащения поиска (П.5): {min, max, clinics_count}."""
    prices = [
        _f(i.price_resident_kzt)
        for i in PriceItem.query.filter(PriceItem.service_id == service_id,
                                        PriceItem.is_active.is_(True)).all()
    ]
    s = _stats(prices)
    return {'min': s['min'], 'max': s['max'], 'clinics_count': s['count']}


# ---------------------------------------------------------------------------
# Сводные отчёты (анализ цен по городу) — реальный результат обработки прайсов.
# Отчёт строится «на лету» из актуальных позиций (is_active=True), сгруппированных
# по городу клиники: матрица сравнения «услуга × клиника» + разброс цен.
# ---------------------------------------------------------------------------

def _report_dataset():
    """Актуальные позиции вместе с клиникой и услугой справочника (один проход)."""
    return (db.session.query(PriceItem, Partner, Service)
            .join(Partner, Partner.partner_id == PriceItem.partner_id)
            .outerjoin(Service, Service.service_id == PriceItem.service_id)
            .filter(PriceItem.is_active.is_(True))
            .all())


def _savings_pct(svc_prices: dict) -> int:
    """Средняя потенциальная экономия по услугам с ≥2 предложениями:
    среднее по услугам от (max-min)/max. svc_prices = {service_id: [цены]}."""
    ratios = []
    for prices in svc_prices.values():
        if len(prices) >= 2 and max(prices):
            ratios.append((max(prices) - min(prices)) / max(prices))
    return round(sum(ratios) / len(ratios) * 100) if ratios else 0


def _city_of(partner) -> str:
    return partner.city or 'Не указан'


def list_reports():
    """Список сводных отчётов — по одному на город, у которого есть цены.

    Каждый отчёт агрегирует реальные показатели обработки прайсов города.
    """
    by_city = {}
    for item, partner, _svc in _report_dataset():
        city = _city_of(partner)
        bucket = by_city.setdefault(city, {
            'items': 0, 'partners': set(), 'docs': set(),
            'svc_prices': {}, 'dates': [],
        })
        bucket['items'] += 1
        bucket['partners'].add(partner.partner_id)
        if item.doc_id:
            bucket['docs'].add(item.doc_id)
        if item.effective_date:
            bucket['dates'].append(item.effective_date)
        price = _f(item.price_resident_kzt)
        if item.service_id and price is not None:
            bucket['svc_prices'].setdefault(item.service_id, []).append(price)

    reports = []
    for city, b in by_city.items():
        latest = max(b['dates']) if b['dates'] else None
        reports.append({
            'id': city,
            'title': f'Единый отчёт · {city}',
            'city': city,
            'date': latest.isoformat() if latest else None,
            'clinics': len(b['partners']),
            'items': b['items'],
            'files': len(b['docs']),
            'savings': _savings_pct(b['svc_prices']),
            'status': 'done',
        })
    reports.sort(key=lambda r: (r['date'] or ''), reverse=True)
    return reports


def build_report(report_id: str):
    """Детальный сводный отчёт по городу: матрица сравнения цен + разброс.

    Возвращает None, если по городу нет данных. report_id — название города.
    """
    target = (report_id or '').strip().lower()
    data = [(i, p, s) for (i, p, s) in _report_dataset()
            if _city_of(p).lower() == target]
    if not data:
        return None

    city = _city_of(data[0][1])

    # Колонки = клиники города (стабильный порядок по названию).
    partners = {}
    for _item, partner, _svc in data:
        partners[partner.partner_id] = partner.name
    columns = [{'key': pid, 'label': name}
               for pid, name in sorted(partners.items(), key=lambda kv: kv[1])]

    # Строки = услуги справочника; для каждой клиники берём минимальную цену.
    services = {}
    svc_prices = {}
    for item, partner, svc in data:
        price = _f(item.price_resident_kzt)
        if not item.service_id or not svc or price is None:
            continue
        row = services.setdefault(item.service_id, {'service': svc.service_name, 'prices': {}})
        cur = row['prices'].get(partner.partner_id)
        if cur is None or price < cur:
            row['prices'][partner.partner_id] = price
        svc_prices.setdefault(item.service_id, []).append(price)

    rows = []
    for _sid, r in services.items():
        prices = r['prices']
        if not prices:
            continue
        best_pid = min(prices, key=prices.get)
        rows.append({
            'service': r['service'],
            'prices': {pid: round(v) for pid, v in prices.items()},
            'best': best_pid,
            'coverage': len(prices),
        })
    # Сначала услуги, представленные в большем числе клиник (нагляднее сравнение).
    rows.sort(key=lambda x: (-x['coverage'], x['service']))
    rows = rows[:20]

    # Разброс цен — для услуги с максимальным разбросом между клиниками города.
    chart, chart_service, chart_stats = [], None, None
    candidate = None
    for sid, r in services.items():
        vals = list(r['prices'].values())
        if len(vals) >= 2 and min(vals):
            spread = max(vals) / min(vals)
            if candidate is None or spread > candidate[1]:
                candidate = (sid, spread)
    if candidate:
        vals = sorted(services[candidate[0]]['prices'].values())
        chart = [round(v) for v in vals]
        chart_service = services[candidate[0]]['service']
        chart_stats = _stats(vals)

    latest = max((i.effective_date for i, _p, _s in data if i.effective_date), default=None)

    return {
        'id': city,
        'title': f'Единый отчёт · {city}',
        'city': city,
        'date': latest.isoformat() if latest else None,
        'summary': {
            'items': len(data),
            'clinics': len(partners),
            'files': len({i.doc_id for i, _p, _s in data if i.doc_id}),
            'savings': _savings_pct(svc_prices),
        },
        'columns': columns,
        'rows': rows,
        'chart': chart,
        'chart_service': chart_service,
        'chart_stats': chart_stats,
    }
