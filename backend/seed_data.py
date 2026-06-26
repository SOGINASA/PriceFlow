"""Демо-данные для разработки: небольшой справочник услуг.

Реальный целевой справочник загружается организаторами через POST /api/catalog/import.
Запуск: python seed_data.py
"""
from app import create_app
from models import db, Service

DEMO_SERVICES = [
    {'service_name': 'Общий анализ крови', 'category': 'лаборатория',
     'synonyms': ['ОАК', 'клинический анализ крови', 'общий анализ крови (развёрнутый)']},
    {'service_name': 'Биохимический анализ крови', 'category': 'лаборатория',
     'synonyms': ['биохимия крови', 'БАК']},
    {'service_name': 'УЗИ органов брюшной полости', 'category': 'диагностика',
     'synonyms': ['УЗИ ОБП', 'ультразвуковое исследование брюшной полости']},
    {'service_name': 'Консультация терапевта', 'category': 'консультация',
     'synonyms': ['приём терапевта', 'осмотр терапевта']},
    {'service_name': 'Электрокардиография', 'category': 'диагностика',
     'synonyms': ['ЭКГ', 'ЭКГ с расшифровкой']},
]


def seed():
    for s in DEMO_SERVICES:
        if not Service.query.filter_by(service_name=s['service_name']).first():
            db.session.add(Service(**s))
    db.session.commit()
    print(f'Справочник: {Service.query.count()} услуг')


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        seed()
