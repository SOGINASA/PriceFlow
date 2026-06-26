"""Аутентификация оператора админ-раздела (ТЗ 4.6).

Простой логин по логину/паролю из Config → JWT с ролью admin.
Декоратор admin_required защищает операторские эндпоинты при необходимости.
"""
from functools import wraps

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, verify_jwt_in_request, get_jwt

from config import Config

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
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    if username != Config.ADMIN_USERNAME or password != Config.ADMIN_PASSWORD:
        return jsonify({'error': 'Неверный логин или пароль'}), 401
    token = create_access_token(identity=username, additional_claims={'role': 'admin'})
    return jsonify({'access_token': token})
