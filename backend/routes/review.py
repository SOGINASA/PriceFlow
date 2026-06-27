"""Очереди верификации и ручное сопоставление (ТЗ 4.3, 4.4, 4.5).

GET  /api/unmatched        — несопоставленные позиции (service_id IS NULL)
GET  /api/needs-review     — позиции с аномалиями / документы needs_review
POST /api/match            — ручное сопоставление позиции с услугой справочника
POST /api/verify           — подтвердить/отклонить/скорректировать позицию
"""
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

from models import db, PriceItem, Service, PriceDocument, Role
from services.normalization_service import match_service, learn_synonym, MANUAL

review_bp = Blueprint('review', __name__)


def admin_required(fn):
    """Очереди верификации и матчинг доступны только админу (ТЗ 4.6).

    Без этого любой мог бы менять привязки и «отравлять» обучаемые синонимы
    через неаутентифицированный /match."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get('role') != Role.ADMIN:
            return jsonify({'error': 'Требуются права администратора'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _current_user_id():
    """Идентификатор админа из JWT (токен уже проверен admin_required)."""
    return get_jwt_identity()


@review_bp.route('/unmatched', methods=['GET'])
@admin_required
def unmatched():
    """Позиции без привязки к справочнику + топ-подсказка из match_service."""
    items = (PriceItem.query
             .filter(PriceItem.service_id.is_(None), PriceItem.is_active.is_(True))
             .limit(500).all())
    out = []
    for it in items:
        suggestion, score, method = match_service(it.service_name_raw)
        d = it.to_dict()
        d['suggestion'] = (
            {'service_id': suggestion.service_id, 'service_name': suggestion.service_name,
             'score': round(score, 3), 'method': method} if suggestion else None
        )
        out.append(d)
    return jsonify(out)


@review_bp.route('/needs-review', methods=['GET'])
@admin_required
def needs_review():
    items = (PriceItem.query
             .filter(PriceItem.has_anomaly.is_(True), PriceItem.is_active.is_(True))
             .limit(500).all())
    return jsonify([it.to_dict() for it in items])


@review_bp.route('/match', methods=['POST'])
@admin_required
def match():
    """Ручное сопоставление: {item_id, service_id} или создать новую услугу."""
    data = request.get_json() or {}
    item = db.session.get(PriceItem, data.get('item_id'))
    if not item:
        return jsonify({'error': 'Позиция не найдена'}), 404

    service_id = data.get('service_id')
    source = 'operator_match'
    if not service_id and data.get('new_service_name'):
        svc = Service(service_name=data['new_service_name'].strip(),
                      category=data.get('category'), synonyms=[])
        db.session.add(svc)
        db.session.flush()
        service_id = svc.service_id
        source = 'new_service'
    svc = db.session.get(Service, service_id) if service_id else None
    if not svc:
        return jsonify({'error': 'Укажите существующий service_id или new_service_name'}), 400

    item.service_id = service_id
    item.is_verified = True
    item.match_score = 1.0
    item.match_method = MANUAL
    item.verification_note = data.get('note')

    # Дообучение (ТЗ 4.3): запоминаем сырое название как синоним услуги, чтобы
    # следующая такая же позиция сопоставилась автоматически.
    learned = learn_synonym(svc, item.service_name_raw, source=source,
                            created_by=_current_user_id())

    db.session.commit()
    return jsonify({**item.to_dict(), 'learned_synonym': learned})


@review_bp.route('/verify', methods=['POST'])
@admin_required
def verify():
    """Подтвердить/отклонить/скорректировать позицию (ТЗ 4.4).

    {item_id, action: confirm|reject|correct, price_resident?, price_nonresident?, note?}
    """
    data = request.get_json() or {}
    item = db.session.get(PriceItem, data.get('item_id'))
    if not item:
        return jsonify({'error': 'Позиция не найдена'}), 404

    action = data.get('action')
    if action == 'confirm':
        item.is_verified = True
        item.has_anomaly = False
    elif action == 'reject':
        item.is_active = False
    elif action == 'correct':
        if 'price_resident' in data:
            item.price_resident_kzt = data['price_resident']
        if 'price_nonresident' in data:
            item.price_nonresident_kzt = data['price_nonresident']
        item.is_verified = True
        item.has_anomaly = False
    else:
        return jsonify({'error': 'action: confirm|reject|correct'}), 400

    item.verification_note = data.get('note')
    db.session.commit()
    return jsonify(item.to_dict())
