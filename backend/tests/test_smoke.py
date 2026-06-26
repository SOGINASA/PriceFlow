"""Дымовые тесты: приложение поднимается, базовые эндпоинты отвечают."""
import pytest

from app import create_app
from config import TestingConfig
from models import db, Service, Partner, PriceItem


@pytest.fixture
def client():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def test_health(client):
    assert client.get('/api').status_code == 200


def test_catalog_import_and_search(client):
    resp = client.post('/api/catalog/import', json=[
        {'service_name': 'Общий анализ крови', 'category': 'лаборатория', 'synonyms': ['ОАК']},
    ])
    assert resp.status_code == 200
    assert resp.get_json()['created'] == 1

    resp = client.get('/api/search?q=крови')
    assert resp.status_code == 200
    assert len(resp.get_json()['services']) == 1


def test_normalization_matches_synonym(client):
    from services.normalization_service import match_service
    db.session.add(Service(service_name='Общий анализ крови', synonyms=['ОАК']))
    db.session.commit()
    svc, score = match_service('ОАК')
    assert svc is not None
    assert score == 1.0


def test_dashboard_stats(client):
    resp = client.get('/api/dashboard/stats')
    assert resp.status_code == 200
    assert 'normalization_rate_pct' in resp.get_json()['items']


def _seed_service_with_offers(prices_by_city):
    """Создать услугу и по одной клинике с ценой на каждый (город, цена)."""
    svc = Service(service_name='Общий анализ крови')
    db.session.add(svc)
    db.session.flush()
    for i, (city, price) in enumerate(prices_by_city):
        p = Partner(name=f'Клиника {i}', city=city)
        db.session.add(p)
        db.session.flush()
        db.session.add(PriceItem(
            partner_id=p.partner_id, service_id=svc.service_id,
            service_name_raw='ОАК', price_resident_kzt=price, is_active=True,
        ))
    db.session.commit()
    return svc.service_id


def test_analytics_compare(client):
    svc_id = _seed_service_with_offers([
        ('Алматы', 4000), ('Астана', 3000), ('Шымкент', 5000),
    ])
    resp = client.get(f'/api/analytics/services/{svc_id}/compare')
    assert resp.status_code == 200
    data = resp.get_json()
    s = data['summary']
    assert s['count'] == 3
    assert s['min'] == 3000 and s['max'] == 5000
    assert s['median'] == 4000
    assert s['spread_ratio'] == round(5000 / 3000, 2)
    # offers отсортированы по возрастанию -> самая дешёвая первой
    assert data['cheapest']['price_resident_kzt'] == 3000
    assert data['most_expensive']['price_resident_kzt'] == 5000


def test_analytics_by_city(client):
    svc_id = _seed_service_with_offers([('Алматы', 4000), ('Астана', 3000)])
    resp = client.get(f'/api/analytics/services/{svc_id}/by-city')
    assert resp.status_code == 200
    cities = resp.get_json()['cities']
    assert len(cities) == 2
    # отсортированы по медиане по возрастанию -> Астана (3000) первой
    assert cities[0]['city'] == 'Астана'


def test_analytics_compare_404(client):
    resp = client.get('/api/analytics/services/does-not-exist/compare')
    assert resp.status_code == 404


def _box(x0, y0, x1, y1, text):
    """Хелпер: bbox EasyOCR (4 точки) + текст."""
    return ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], text)


def test_group_boxes_to_rows():
    """Фрагменты OCR с близким Y — одна строка, ячейки сортируются по X."""
    from services.extractors.row_parser import group_boxes_to_rows

    boxes = [
        _box(200, 10, 260, 25, '12 500'),             # цена (правее, та же строка)
        _box(10, 12, 150, 27, 'Общий анализ крови'),  # название (левее)
        _box(10, 60, 150, 75, 'ЭКГ'),                 # вторая строка ниже
        _box(200, 58, 260, 73, '4 500'),
    ]
    rows = group_boxes_to_rows(boxes, y_tol=10)
    assert rows == [['Общий анализ крови', '12 500'], ['ЭКГ', '4 500']]


def test_parse_ocr_row_multicolumn():
    """Несколько колонок цен (отдельные ячейки) НЕ слипаются в одно число."""
    from services.extractors.row_parser import group_boxes_to_rows, parse_ocr_row

    # 3 колонки цен: резидент / страховка / нерезидент
    boxes = [
        _box(10, 10, 200, 25, 'Прием врача первичный'),
        _box(300, 10, 360, 25, '900'),
        _box(420, 10, 490, 25, '15 000'),
        _box(540, 10, 610, 25, '10 000'),
    ]
    rows = group_boxes_to_rows(boxes, y_tol=10)
    row = parse_ocr_row(rows[0])
    assert row.service_name_raw == 'Прием врача первичный'
    assert row.price_resident == 900.0          # 1-я колонка
    assert row.price_nonresident == 15000.0     # 2-я колонка, НЕ 9001500010000
