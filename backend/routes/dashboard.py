"""Дашборд метрик обработки (ТЗ 4.6, 7 — отчёт о качестве).

GET /api/dashboard/stats — кол-во документов по статусам, % нормализации, очереди.
"""
from flask import Blueprint, jsonify

from models import db, PriceDocument, PriceItem, Partner, Service, ParseStatus

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
def stats():
    docs_total = PriceDocument.query.count()
    docs_by_status = dict(
        db.session.query(PriceDocument.parse_status, db.func.count())
        .group_by(PriceDocument.parse_status).all()
    )

    items_total = PriceItem.query.filter(PriceItem.is_active.is_(True)).count()
    items_matched = PriceItem.query.filter(
        PriceItem.is_active.is_(True), PriceItem.service_id.isnot(None)
    ).count()
    unmatched = items_total - items_matched
    anomalies = PriceItem.query.filter(
        PriceItem.is_active.is_(True), PriceItem.has_anomaly.is_(True)
    ).count()

    normalization_rate = round(items_matched / items_total * 100, 1) if items_total else 0.0

    return jsonify({
        'documents': {
            'total': docs_total,
            'by_status': docs_by_status,
            'done': docs_by_status.get(ParseStatus.DONE, 0),
            'errors': docs_by_status.get(ParseStatus.ERROR, 0),
            'needs_review': docs_by_status.get(ParseStatus.NEEDS_REVIEW, 0),
        },
        'items': {
            'total': items_total,
            'matched': items_matched,
            'unmatched': unmatched,
            'anomalies': anomalies,
            'normalization_rate_pct': normalization_rate,  # цель MVP ≥ 70%
        },
        'partners': Partner.query.count(),
        'services': Service.query.filter_by(is_active=True).count(),
    })
