"""Полнотекстовый поиск по услугам и партнёрам (ТЗ 4.5).

GET /api/search?q=...

Многословный поиск: запрос разбивается на слова, и каждое слово должно встретиться
(в любом порядке) — у услуги в названии ИЛИ синонимах, у клиники в названии, городе
или адресе. Так «узи почек алматы» найдётся независимо от порядка слов.

Регистронезависимость — на стороне Python через casefold(): SQLite LIKE/ILIKE не
учитывает регистр кириллицы («Консультация»≈«консультация»). На больших объёмах под
PostgreSQL рекомендуется FTS (to_tsvector/plainto_tsquery) или MeiliSearch/Elasticsearch
— структура ответа не изменится.
"""
from flask import Blueprint, request, jsonify

from models import Service, Partner
from services.analytics_service import price_summary_for_service, partner_price_aggregates

search_bp = Blueprint('search', __name__)


@search_bp.route('', methods=['GET'])
def search():
    q = (request.args.get('q') or '').strip()
    terms = [t.casefold() for t in q.split() if t]
    if not terms:
        return jsonify({'query': q, 'services': [], 'partners': []})

    def svc_match(s):
        # для услуги каждое слово запроса должно быть в названии или в одном из синонимов
        haystacks = [(s.service_name or '').casefold()]
        haystacks += [str(syn).casefold() for syn in (s.synonyms or [])]
        return all(any(term in h for h in haystacks) for term in terms)

    def partner_match(p):
        # для клиники — в названии, городе или адресе
        haystacks = [(p.name or '').casefold(), (p.city or '').casefold(),
                     (p.address or '').casefold()]
        return all(any(term in h for h in haystacks) for term in terms)

    services = [s for s in Service.query.filter(Service.is_active.is_(True)).limit(2000).all()
                if svc_match(s)][:50]
    partners = [p for p in Partner.query.limit(2000).all() if partner_match(p)][:50]

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
