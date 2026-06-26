"""Юнит-тесты экстракции прайсов (ТЗ 4.2): шапки, колонки, разбор чисел.

Чистые функции — без БД/приложения.
"""
from services.extractors import row_parser as rp
from services.extractors import pdf_text


def test_classify_multirow_header_below_preamble():
    """Клиника-8 кейс: длинная преамбула, двухстрочная шапка, колонка № и
    единственная цена с текстом «для граждан … а также иностранцев»."""
    rows = [
        ['ПРЕЙСКУРАНТ'],
        ['цен на медицинские услуги'],                       # титул-однострочник — не шапка
        ['№ п/п', 'Наименование услуги', 'Код по тарификатору, МКБ', 'ед. измерения',
         'для граждан Республики Казахстан, кандасов, а также иностранцев'],
        ['ПРИЕМ ВРАЧА'],                                     # секция
        ['1', 'Консультация терапевта', 'A01.1', 'прием', '15480'],
        ['2', 'Консультация хирурга', 'A02.2', 'прием', '19320'],
        ['3', 'Консультация невролога', 'A03.3', 'прием', '12840'],
        ['4', 'Консультация кардиолога', 'A04.4', 'прием', '15480'],
    ]
    hidx, cm = rp.classify_columns(rows)
    assert cm['name'] == 1
    assert cm['code'] == 2
    assert cm['price_resident'] == 4          # единственная цена → резидент (не nonres)
    assert cm['price_nonresident'] is None


def test_classify_two_price_columns_resident_nonresident():
    rows = [
        ['№', 'Услуга', 'Цена для резидентов', 'Цена для нерезидентов'],
        ['1', 'Приём терапевта', '5000', '8000'],
        ['2', 'УЗИ ОБП', '10000', '15000'],
        ['3', 'Рентген', '4000', '6000'],
    ]
    _, cm = rp.classify_columns(rows)
    assert cm['name'] == 1
    assert cm['price_resident'] == 2
    assert cm['price_nonresident'] == 3


def test_detect_price_excludes_index_column():
    """Колонка-нумератор 1..N (малая медиана) не должна стать ценой."""
    rows = [['1', 'Услуга A', '12000'], ['2', 'Услуга B', '8000'],
            ['3', 'Услуга C', '9000'], ['4', 'Услуга D', '10000']]
    cols = rp._detect_price_columns(rows, 0, exclude={1})
    assert cols == [2]                         # col0 (№) отсеян по медиане < 100


def test_merge_thousands_and_drop_index():
    # «9»+«900» → «9900»; две отдельные цены не слипаются
    assert pdf_text._merge_thousands(['9', '900', '15', '000']) == ['9900', '15000']
    assert pdf_text._merge_thousands(['1', '234', '567']) == ['1234567']
    # номер строки «6» (<100) отбрасывается, реальные цены остаются
    assert pdf_text._drop_index_numbers(['6', 'Приём', '9900', '15000']) == ['Приём', '9900', '15000']


def test_currency_detection_no_false_positive():
    assert rp.detect_currency(['12 500']) == 'KZT'
    assert rp.detect_currency(['$120']) == 'USD'
    assert rp.detect_currency(['5 200 ₽']) == 'RUB'
    assert rp.detect_currency(['услуги ближнего зарубежья']) == 'KZT'   # «зарубежья» ≠ RUB
