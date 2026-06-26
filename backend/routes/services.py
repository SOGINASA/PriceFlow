"""API услуг справочника (ТЗ 4.5).

GET /api/services                  — список услуг с фильтром по категории
GET /api/services/{id}/partners    — кто оказывает услугу и по какой цене
"""
from flask import Blueprint, request, jsonify

from models import db, Service, PriceItem, Partner

services_bp = Blueprint('services', __name__)


@services_bp.route('', methods=['GET'])
def list_services():
    q = Service.query.filter_by(is_active=True)
    category = request.args.get('category')
    if category:
        q = q.filter_by(category=category)
    services = q.order_by(Service.service_name).limit(1000).all()
    return jsonify([s.to_dict() for s in services])


@services_bp.route('/<service_id>/partners', methods=['GET'])
def service_partners(service_id):
    """Список партнёров, оказывающих услугу, с ценами резидент/нерезидент."""
    svc = db.session.get(Service, service_id)
    if not svc:
        return jsonify({'error': 'Услуга не найдена'}), 404

    rows = (db.session.query(PriceItem, Partner)
            .join(Partner, Partner.partner_id == PriceItem.partner_id)
            .filter(PriceItem.service_id == service_id, PriceItem.is_active.is_(True))
            .order_by(PriceItem.price_resident_kzt.asc())
            .all())

    result = []
    for item, partner in rows:
        result.append({
            'partner_id': partner.partner_id,
            'partner_name': partner.name,
            'city': partner.city,
            'price_resident_kzt': float(item.price_resident_kzt) if item.price_resident_kzt is not None else None,
            'price_nonresident_kzt': float(item.price_nonresident_kzt) if item.price_nonresident_kzt is not None else None,
            'effective_date': item.to_dict()['effective_date'],
            'is_verified': item.is_verified,
        })
    return jsonify({'service': svc.to_dict(), 'partners': result})
