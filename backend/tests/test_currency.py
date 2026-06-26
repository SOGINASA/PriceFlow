"""Тесты конвертации валют по курсу на дату прайса (ТЗ 4.4) и распознавания
валюты в строках прайса."""
from datetime import date

import pytest

from app import create_app
from config import TestingConfig
from models import db, ExchangeRate, Currency
from services import currency_service as fx
from services.extractors.row_parser import (
    parse_table_row, parse_text_line, detect_currency, looks_like_price,
)


@pytest.fixture
def app_ctx():
    app = create_app(TestingConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


# --- конвертация --------------------------------------------------------------
def test_kzt_is_identity(app_ctx):
    assert fx.convert_to_kzt(1000, Currency.KZT, date(2025, 3, 1)) == 1000.0
    assert fx.get_rate(Currency.KZT, date(2025, 3, 1)) == 1.0


def test_fallback_when_no_rate_in_db(app_ctx):
    # пустая таблица курсов + FX_AUTO_FETCH=False → статический фолбэк (USD=470)
    assert fx.convert_to_kzt(100, Currency.USD) == 47000.0


def test_rate_picked_by_price_date(app_ctx):
    fx.upsert_rate(Currency.USD, date(2025, 1, 1), 450)
    fx.upsert_rate(Currency.USD, date(2025, 6, 1), 500)
    db.session.commit()

    # на дату между публикациями → ближайший предшествующий курс (450)
    assert fx.convert_to_kzt(100, Currency.USD, date(2025, 3, 1)) == 45000.0
    # после второй публикации → 500
    assert fx.convert_to_kzt(100, Currency.USD, date(2025, 7, 1)) == 50000.0
    # прайс старше всех курсов → берём самый ранний доступный (450)
    assert fx.convert_to_kzt(100, Currency.USD, date(2024, 1, 1)) == 45000.0


def test_nbk_xml_parsing():
    xml = (b"<rss><channel>"
           b"<item><title>USD</title><description>478,52</description><quant>1</quant></item>"
           b"<item><title>RUB</title><description>52,3</description><quant>10</quant></item>"
           b"<item><title>EUR</title><description>515,0</description><quant>1</quant></item>"
           b"</channel></rss>")
    parsed = dict(fx._parse_nbk_xml(xml))
    assert parsed['USD'] == 478.52
    assert parsed['RUB'] == 5.23          # 52.3 за 10 единиц → 5.23 за 1
    assert 'EUR' not in parsed            # вне списка KZT/USD/RUB


# --- распознавание валюты в строках ------------------------------------------
def test_table_row_detects_usd_symbol():
    row = parse_table_row(['Анализ крови', '$120'])
    assert row.currency == 'USD'
    assert row.price_resident == 120.0     # число парсится несмотря на символ


def test_table_row_detects_rub():
    row = parse_table_row(['Консультация', '5 200 ₽'])
    assert row.currency == 'RUB'
    assert row.price_resident == 5200.0


def test_table_row_default_kzt_and_no_false_positive():
    # «Рубец» содержит 'руб', но это название, а не ценовая ячейка → остаётся KZT
    row = parse_table_row(['Удаление рубца', '5200'])
    assert row.currency == 'KZT'
    assert row.price_resident == 5200.0


def test_table_row_separate_currency_cell():
    row = parse_table_row(['МРТ', '300', 'USD'])
    assert row.currency == 'USD'
    assert row.price_resident == 300.0


def test_text_line_currency_suffix():
    row = parse_text_line('Консультация терапевта 40 USD')
    assert row.currency == 'USD'
    assert row.price_resident == 40.0


def test_detect_currency_helpers():
    assert detect_currency(['120 $']) == 'USD'
    assert detect_currency(['5200']) == 'KZT'
    assert looks_like_price('$1 200') is True
    assert looks_like_price('Рубец') is False


# --- API превью ---------------------------------------------------------------
def test_convert_endpoint(app_ctx):
    fx.upsert_rate(Currency.USD, date(2025, 1, 1), 460)
    db.session.commit()
    client = app_ctx.test_client()
    resp = client.get('/api/rates/convert?amount=100&currency=USD&date=2025-05-01')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['rate'] == 460.0
    assert data['amount_kzt'] == 46000.0
