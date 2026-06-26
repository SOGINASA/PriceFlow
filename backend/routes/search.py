"""Полнотекстовый поиск по услугам и партнёрам (ТЗ 4.5).

GET /api/search?q=...

MVP — ILIKE по именам. На PostgreSQL рекомендуется заменить на FTS
(to_tsvector/plainto_tsquery) или вынести в MeiliSearch/Elasticsearch.
"""
from flask import Blueprint, request, jsonify

from models import Service, Partner

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

    return jsonify({
        'query': q,
        'services': [s.to_dict() for s in services],
        'partners': [p.to_dict() for p in partners],
    })
