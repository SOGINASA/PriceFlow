"""Аутентификация оператора админ-раздела (ТЗ 4.6).

Простой логин по логину/паролю из Config → JWT с ролью admin.
Декоратор admin_required защищает операторские эндпоинты при необходимости.
"""
from functools import wraps

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, verify_jwt_in_request, get_jwt

from config import Config
from models import db, User, Role

admin_bp = Blueprint('admin', __name__)


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        if get_jwt().get('role') != 'admin':
            return jsonify({'error': 'Требуются права администратора'}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route('/login', methods=['POST'])
def login():
    """Вход оператора/админа.

    Сначала ищем пользователя в БД по email (login/username) с ролью
    operator|admin. Если не нашли — фолбэк на статичные креды из Config.
    """
    data = request.get_json() or {}
    login_id = (data.get('username') or data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    user = User.query.filter(db.func.lower(User.email) == login_id).first()
    if user and user.is_active and user.role in (Role.OPERATOR, Role.ADMIN, Role.PARTNER) and user.check_password(password):
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        token = create_access_token(identity=user.email, additional_claims={'role': user.role})
        return jsonify({'access_token': token, 'user': user.to_dict()})

    # Фолбэк: статичный админ из конфигурации
    if login_id == Config.ADMIN_USERNAME.lower() and password == Config.ADMIN_PASSWORD:
        token = create_access_token(identity=login_id, additional_claims={'role': Role.ADMIN})
        return jsonify({'access_token': token, 'user': {'email': login_id, 'role': Role.ADMIN}})

    return jsonify({'error': 'Неверный логин или пароль'}), 401
