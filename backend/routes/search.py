"""Полнотекстовый поиск по услугам и партнёрам (ТЗ 4.5).

GET /api/search?q=...

MVP — ILIKE по именам. На PostgreSQL рекомендуется заменить на FTS
(to_tsvector/plainto_tsquery) или вынести в MeiliSearch/Elasticsearch.
"""
from flask import Blueprint, request, jsonify

from models import Service, Partner
from services.analytics_service import price_summary_for_service, partner_price_aggregates

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
def search():
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'services': [], 'partners': []})

    # Регистронезависимый поиск на стороне Python: SQLite LIKE/ILIKE не учитывает
    # регистр кириллицы. casefold() корректно сравнивает «Консультация»≈«консультация».
    # Заодно ищем по синонимам услуги и по городу клиники.
    ql = q.casefold()

    def svc_match(s):
        if ql in (s.service_name or '').casefold():
            return True
        return any(ql in str(syn).casefold() for syn in (s.synonyms or []))

    services = [s for s in Service.query.filter(Service.is_active.is_(True)).limit(2000).all()
                if svc_match(s)][:50]
    partners = [p for p in Partner.query.limit(2000).all()
                if ql in (p.name or '').casefold() or ql in (p.city or '').casefold()][:50]

    # к каждой найденной услуге — краткая сводка цен для перехода в сравнение (П.5)
    services_out = []
    for s in services:
        d = s.to_dict()
        d['price_summary'] = price_summary_for_service(s.service_id)
        services_out.append(d)

    # к каждой клинике — число позиций и «от X ₸» для карточки
    agg = partner_price_aggregates([p.partner_id for p in partners])
    partners_out = []
    for p in partners:
        d = p.to_dict()
        a = agg.get(p.partner_id) or {}
        d['services_count'] = a.get('services_count', 0)
        d['min_price_kzt'] = a.get('min_price_kzt')
        partners_out.append(d)

    return jsonify({
        'query': q,
        'services': services_out,
        'partners': partners_out,
    })
