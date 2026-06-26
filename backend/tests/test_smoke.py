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
