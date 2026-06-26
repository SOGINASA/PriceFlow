"""Аналитика цен (анализ — ТЗ 4.5/4.6). Без ML — агрегации по БД.

GET /api/analytics/services/<id>/compare   — сравнение цен по клиникам + статистика
GET /api/analytics/services/<id>/by-city    — срез цен услуги по городам
GET /api/analytics/services/<id>/trend       — динамика цены во времени (?partner_id=)
GET /api/analytics/anomalies                 — отчёт по аномалиям цен
"""
from flask import Blueprint, request, jsonify

from services import analytics_service as analytics

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/services/<service_id>/compare', methods=['GET'])
def compare(service_id):
    data = analytics.compare_service_prices(service_id)
    if data is None:
        return jsonify({'error': 'Услуга не найдена'}), 404
    return jsonify(data)


@analytics_bp.route('/services/<service_id>/by-city', methods=['GET'])
def by_city(service_id):
    data = analytics.service_prices_by_city(service_id)
    if data is None:
        return jsonify({'error': 'Услуга не найдена'}), 404
    return jsonify(data)


@analytics_bp.route('/services/<service_id>/trend', methods=['GET'])
def trend(service_id):
    data = analytics.service_price_trend(service_id, request.args.get('partner_id'))
    if data is None:
        return jsonify({'error': 'Услуга не найдена'}), 404
    return jsonify(data)


@analytics_bp.route('/anomalies', methods=['GET'])
def anomalies():
    limit = request.args.get('limit', default=200, type=int)
    return jsonify(analytics.list_anomalies(limit=limit))
