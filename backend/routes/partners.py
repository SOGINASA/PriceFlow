"""API партнёров (ТЗ 4.5, 4.6).

GET /api/partners                 — список с фильтром по городу/статусу
GET /api/partners/{id}            — карточка партнёра (контакты)
GET /api/partners/{id}/services   — полный прайс партнёра с ценами
"""
from flask import Blueprint, request, jsonify

from models import db, Partner, PriceItem, Service
from services.analytics_service import partner_price_aggregates

partners_bp = Blueprint('partners', __name__)


def _with_aggregates(partners):
    """Дополнить карточки клиник числом позиций и минимальной ценой («от X ₸»)."""
    agg = partner_price_aggregates([p.partner_id for p in partners])
    out = []
    for p in partners:
        d = p.to_dict()
        a = agg.get(p.partner_id) or {}
        d['services_count'] = a.get('services_count', 0)
        d['min_price_kzt'] = a.get('min_price_kzt')
        out.append(d)
    return out


@partners_bp.route('', methods=['GET'])
def list_partners():
    q = Partner.query
    city = request.args.get('city')
    if city:
        q = q.filter(db.func.lower(Partner.city) == city.lower())
    if request.args.get('is_active') in ('1', 'true'):
        q = q.filter_by(is_active=True)
    partners = q.order_by(Partner.name).limit(1000).all()
    return jsonify(_with_aggregates(partners))


@partners_bp.route('/<partner_id>', methods=['GET'])
def get_partner(partner_id):
    partner = db.session.get(Partner, partner_id)
    if not partner:
        return jsonify({'error': 'Партнёр не найден'}), 404
    return jsonify(_with_aggregates([partner])[0])


@partners_bp.route('/<partner_id>/services', methods=['GET'])
def partner_services(partner_id):
    """Полный прайс партнёра: услуги (нормализованное имя если есть) + цены + дата."""
    partner = db.session.get(Partner, partner_id)
    if not partner:
        return jsonify({'error': 'Партнёр не найден'}), 404

    rows = (db.session.query(PriceItem, Service)
            .outerjoin(Service, Service.service_id == PriceItem.service_id)
            .filter(PriceItem.partner_id == partner_id, PriceItem.is_active.is_(True))
            .order_by(PriceItem.service_name_raw)
            .all())

    items = []
    for item, svc in rows:
        d = item.to_dict()
        d['service_name'] = svc.service_name if svc else None
        d['category'] = svc.category if svc else None
        items.append(d)
    return jsonify({'partner': partner.to_dict(), 'items': items})
