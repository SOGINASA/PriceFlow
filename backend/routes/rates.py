"""Курсы валют для конвертации цен на дату прайса (ТЗ 4.4).

GET  /api/rates                 — список сохранённых курсов (фильтр по валюте)
POST /api/rates                 — задать курс вручную {currency, date, rate}
POST /api/rates/refresh         — подтянуть курсы НБ РК {date} или {start,end}
GET  /api/rates/convert         — превью пересчёта ?amount=&currency=&date=
"""
from datetime import date, datetime

from flask import Blueprint, request, jsonify

from models import db, ExchangeRate, Currency
from services import currency_service as fx

rates_bp = Blueprint('rates', __name__)


def _parse_date(value, default=None):
    if not value:
        return default
    return datetime.strptime(value, '%Y-%m-%d').date()


@rates_bp.route('', methods=['GET'])
def list_rates():
    q = ExchangeRate.query
    currency = request.args.get('currency')
    if currency:
        q = q.filter_by(currency=currency.upper())
    rows = q.order_by(ExchangeRate.currency, ExchangeRate.date.desc()).limit(1000).all()
    return jsonify([r.to_dict() for r in rows])


@rates_bp.route('', methods=['POST'])
def upsert_rate():
    """Задать/обновить курс вручную: {currency, date: YYYY-MM-DD, rate}."""
    data = request.get_json() or {}
    currency = (data.get('currency') or '').upper()
    if currency not in (Currency.USD, Currency.RUB):
        return jsonify({'error': 'currency: USD | RUB'}), 400
    try:
        on_date = _parse_date(data.get('date'), date.today())
        rate = float(data['rate'])
    except (KeyError, ValueError, TypeError):
        return jsonify({'error': 'Укажите корректные date (YYYY-MM-DD) и rate'}), 400
    if rate <= 0:
        return jsonify({'error': 'rate должен быть > 0'}), 400

    created = fx.upsert_rate(currency, on_date, rate, source='manual')
    db.session.commit()
    return jsonify({'created': created, 'currency': currency,
                    'date': on_date.isoformat(), 'rate': rate})


@rates_bp.route('/refresh', methods=['POST'])
def refresh_rates():
    """Подтянуть курсы НБ РК: {date} или {start, end} (YYYY-MM-DD)."""
    data = request.get_json() or {}
    try:
        if data.get('start'):
            start = _parse_date(data['start'])
            end = _parse_date(data.get('end'), start)
        else:
            start = end = _parse_date(data.get('date'), date.today())
    except (ValueError, TypeError):
        return jsonify({'error': 'Даты в формате YYYY-MM-DD'}), 400

    summary = fx.refresh_rates(start, end)
    status = 200 if not summary['errors'] or summary['stored'] else 502
    return jsonify(summary), status


@rates_bp.route('/convert', methods=['GET'])
def convert():
    """Превью пересчёта в KZT: ?amount=120&currency=USD&date=2025-03-01."""
    try:
        amount = float(request.args.get('amount'))
    except (TypeError, ValueError):
        return jsonify({'error': 'amount обязателен и должен быть числом'}), 400
    currency = (request.args.get('currency') or Currency.KZT).upper()
    try:
        on_date = _parse_date(request.args.get('date'))
    except ValueError:
        return jsonify({'error': 'date в формате YYYY-MM-DD'}), 400

    rate = fx.get_rate(currency, on_date)
    return jsonify({
        'amount': amount,
        'currency': currency,
        'date': on_date.isoformat() if on_date else None,
        'rate': rate,
        'amount_kzt': fx.convert_to_kzt(amount, currency, on_date),
    })
