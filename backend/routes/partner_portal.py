"""Кабинет партнёра (роль partner) — клиника сама ведёт свой прайс.

Эндпоинты (JWT, роль partner; admin может действовать за любую клинику):
    GET    /api/me                      — текущий пользователь + его клиника
    PATCH  /api/me/clinic               — обновить профиль клиники
    GET    /api/me/items                — прайс клиники (с историей цен)
    POST   /api/me/items               — добавить услугу/препарат
    PATCH  /api/me/items/{item_id}      — изменить цену/название (старая цена → в историю)
    DELETE /api/me/items/{item_id}      — убрать позицию (деактивировать)
    GET    /api/price-items/{id}/history — история цен позиции (ПУБЛИЧНО, видно всем)

История цен ведётся в PriceItemHistory (ТЗ 4.4 / 5 — хранится бессрочно).
"""
from functools import wraps
from datetime import date, datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt, get_jwt_identity

from models import db, User, Role, Partner, PriceItem, PriceItemHistory, PriceDocument, Service, ParseStatus, Currency

portal_bp = Blueprint('partner_portal', __name__)


# --------------------------------------------------------------------------- helpers
def partner_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get('role') not in (Role.PARTNER, Role.ADMIN):
            return jsonify({'error': 'Требуется роль партнёра'}), 403
        return fn(*args, **kwargs)
    return wrapper


def _current_user():
    email = get_jwt_identity()
    if not email:
        return None
    return User.query.filter(db.func.lower(User.email) == str(email).lower()).first()


def _my_partner_id():
    """Клиника текущего партнёра. Admin может указать ?partner_id=/в теле."""
    user = _current_user()
    if user and user.partner_id:
        return user.partner_id
    if get_jwt().get('role') == Role.ADMIN:
        body = request.get_json(silent=True) or {}
        return request.args.get('partner_id') or body.get('partner_id')
    return None


def _to_num(v):
    if v is None or v == '':
        return None
    try:
        return float(str(v).replace(' ', '').replace(',', '.'))
    except (TypeError, ValueError):
        return None


def _parse_date(v):
    if not v:
        return date.today()
    try:
        return date.fromisoformat(str(v)[:10])
    except ValueError:
        return date.today()


def _item_dict(item):
    """Позиция прайса + нормализованное имя/категория + история цен."""
    d = item.to_dict()
    svc = db.session.get(Service, item.service_id) if item.service_id else None
    d['service_name'] = svc.service_name if svc else None
    d['category'] = svc.category if svc else None
    d['history'] = [h.to_dict() for h in
                    item.history.order_by(PriceItemHistory.effective_date.asc()).all()]
    return d


def _manual_doc(partner_id):
    """Документ-контейнер для позиций, заведённых вручную в кабинете партнёра."""
    doc = (PriceDocument.query
           .filter_by(partner_id=partner_id, file_name='Кабинет партнёра (ручной ввод)')
           .first())
    if not doc:
        doc = PriceDocument(
            partner_id=partner_id,
            file_name='Кабинет партнёра (ручной ввод)',
            file_format='manual',
            parse_status=ParseStatus.DONE,
            parsed_at=datetime.now(timezone.utc),
            parse_log='Создано партнёром через кабинет',
        )
        db.session.add(doc)
        db.session.flush()
    return doc


# --------------------------------------------------------------------------- me
@portal_bp.route('/me', methods=['GET'])
@partner_required
def me():
    user = _current_user()
    pid = _my_partner_id()
    clinic = db.session.get(Partner, pid) if pid else None
    return jsonify({
        'user': user.to_dict() if user else {'role': get_jwt().get('role')},
        'clinic': clinic.to_dict() if clinic else None,
    })


@portal_bp.route('/me/clinic', methods=['PATCH'])
@partner_required
def update_my_clinic():
    pid = _my_partner_id()
    clinic = db.session.get(Partner, pid) if pid else None
    if not clinic:
        return jsonify({'error': 'Клиника партнёра не найдена'}), 404
    data = request.get_json() or {}
    for field in ('name', 'city', 'address', 'contact_phone', 'contact_email', 'description'):
        if field in data:
            setattr(clinic, field, data[field])
    # совместимость с фронтом (phone/email)
    if 'phone' in data:
        clinic.contact_phone = data['phone']
    if 'email' in data:
        clinic.contact_email = data['email']
    db.session.commit()
    return jsonify(clinic.to_dict())


# --------------------------------------------------------------------------- items
@portal_bp.route('/me/items', methods=['GET'])
@partner_required
def my_items():
    pid = _my_partner_id()
    if not pid:
        return jsonify({'error': 'Клиника не определена'}), 404
    items = (PriceItem.query
             .filter_by(partner_id=pid, is_active=True)
             .order_by(PriceItem.service_name_raw).all())
    return jsonify([_item_dict(it) for it in items])


@portal_bp.route('/me/items', methods=['POST'])
@partner_required
def add_item():
    pid = _my_partner_id()
    if not pid:
        return jsonify({'error': 'Клиника не определена'}), 404
    data = request.get_json() or {}
    name = (data.get('name') or data.get('service_name_raw') or '').strip()
    resident = _to_num(data.get('resident'))
    if not name or resident is None:
        return jsonify({'error': 'Укажите название и цену резидента'}), 400

    doc = _manual_doc(pid)
    item = PriceItem(
        doc_id=doc.doc_id,
        partner_id=pid,
        service_name_raw=name,
        price_resident_kzt=resident,
        price_nonresident_kzt=_to_num(data.get('nonresident')),
        price_original=resident,
        currency_original=Currency.KZT,
        effective_date=_parse_date(data.get('effective_date')),
        is_verified=True,
        is_active=True,
    )
    db.session.add(item)
    db.session.flush()
    # авто-привязка к справочнику (best-effort)
    try:
        from services.normalization_service import normalize_item
        normalize_item(item)
    except Exception:  # noqa: BLE001
        pass
    db.session.commit()
    return jsonify(_item_dict(item)), 201


def _owned_item(item_id):
    item = db.session.get(PriceItem, item_id)
    if not item:
        return None, (jsonify({'error': 'Позиция не найдена'}), 404)
    pid = _my_partner_id()
    if get_jwt().get('role') != Role.ADMIN and item.partner_id != pid:
        return None, (jsonify({'error': 'Нет доступа к позиции'}), 403)
    return item, None


@portal_bp.route('/me/items/<item_id>', methods=['PATCH'])
@partner_required
def update_item(item_id):
    item, err = _owned_item(item_id)
    if err:
        return err
    data = request.get_json() or {}

    new_res = _to_num(data.get('resident'))
    new_non = _to_num(data.get('nonresident'))
    new_date = _parse_date(data.get('effective_date')) if data.get('effective_date') else item.effective_date

    price_changed = (
        (new_res is not None and float(item.price_resident_kzt or 0) != new_res) or
        (new_non is not None and float(item.price_nonresident_kzt or 0) != new_non)
    )
    # старую цену — в историю (видно всем, бессрочно)
    if price_changed:
        db.session.add(PriceItemHistory(
            item_id=item.item_id,
            price_resident_kzt=item.price_resident_kzt,
            price_nonresident_kzt=item.price_nonresident_kzt,
            effective_date=item.effective_date,
            reason='partner_edit',
        ))
        if new_res is not None:
            item.price_resident_kzt = new_res
            item.price_original = new_res
        if new_non is not None:
            item.price_nonresident_kzt = new_non
        item.effective_date = new_date

    if data.get('name'):
        item.service_name_raw = data['name'].strip()

    db.session.commit()
    return jsonify(_item_dict(item))


@portal_bp.route('/me/items/<item_id>', methods=['DELETE'])
@partner_required
def delete_item(item_id):
    item, err = _owned_item(item_id)
    if err:
        return err
    item.is_active = False
    db.session.commit()
    return jsonify({'ok': True, 'item_id': item_id})


# --------------------------------------------------------------------------- public history
@portal_bp.route('/price-items/<item_id>/history', methods=['GET'])
def price_history(item_id):
    """История цен позиции — публично, видно всем пользователям (ТЗ 4.4)."""
    item = db.session.get(PriceItem, item_id)
    if not item:
        return jsonify({'error': 'Позиция не найдена'}), 404
    history = [h.to_dict() for h in
               item.history.order_by(PriceItemHistory.effective_date.asc()).all()]
    return jsonify({
        'item_id': item.item_id,
        'service_name_raw': item.service_name_raw,
        'current': {
            'price_resident_kzt': float(item.price_resident_kzt) if item.price_resident_kzt is not None else None,
            'price_nonresident_kzt': float(item.price_nonresident_kzt) if item.price_nonresident_kzt is not None else None,
            'effective_date': item.to_dict()['effective_date'],
        },
        'history': history,
    })
