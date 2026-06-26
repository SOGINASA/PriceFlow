"""Полнотекстовый поиск по услугам и партнёрам (ТЗ 4.5).

GET /api/search?q=...

MVP — ILIKE по именам. На PostgreSQL рекомендуется заменить на FTS
(to_tsvector/plainto_tsquery) или вынести в MeiliSearch/Elasticsearch.
"""
from flask import Blueprint, request, jsonify

from models import Service, Partner
from services.analytics_service import price_summary_for_service

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
def search():
    q = (request.args.get('q') or '').strip()
    if not q:
        return jsonify({'services': [], 'partners': []})

    like = f'%{q}%'
    services = (Service.query
                .filter(Service.service_name.ilike(like), Service.is_active.is_(True))
                .limit(50).all())
    partners = (Partner.query
                .filter(Partner.name.ilike(like))
                .limit(50).all())

    # к каждой найденной услуге — краткая сводка цен для перехода в сравнение (П.5)
    services_out = []
    for s in services:
        d = s.to_dict()
        d['price_summary'] = price_summary_for_service(s.service_id)
        services_out.append(d)

    return jsonify({
        'query': q,
        'services': services_out,
        'partners': [p.to_dict() for p in partners],
    })
