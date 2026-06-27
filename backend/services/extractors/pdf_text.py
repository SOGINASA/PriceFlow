"""Извлечение из текстового PDF (ТЗ 4.2). pdfplumber / PyMuPDF.

Две стратегии на страницу:
    1) таблицы с линиями-границами → page.extract_tables();
    2) если границ нет (а в медпрайсах часто так) → реконструкция строк по
       координатам слов (как OCR-боксы): слова группируются по Y в строки,
       внутри строки — по X; затем parse_ocr_row.

Если на странице совсем нет текста (картинка) — диспетчер конвейера переключится
на pdf_ocr (см. pipeline_service._extract_with_ocr_fallback).
"""
import logging

import re

from services.extractors import ExtractResult, RawRow
from services.extractors.row_parser import (
    parse_table_row, looks_like_header, parse_ocr_row,
)

logger = logging.getLogger(__name__)

_MIN_WORD_PRICE = 100   # цена в ₸ ниже этого в word-fallback — это номер строки/мусор
_DIGITS = re.compile(r'^\d+$')


def _drop_index_numbers(cells):
    """Убрать одиночные мелкие числа (номера строк «1», «6»), которые иначе
    парсятся как цена. Настоящие цены ≥ _MIN_WORD_PRICE."""
    res = []
    for c in cells:
        s = str(c).strip()
        if _DIGITS.fullmatch(s) and int(s) < _MIN_WORD_PRICE:
            continue
        res.append(s)
    return res


def extract(file_path: str) -> ExtractResult:
    result = ExtractResult()
    try:
        import pdfplumber
    except ImportError:
        result.warnings.append('pdfplumber не установлен — поставьте requirements.txt')
        return result

    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                result.raw_text += (page.extract_text() or '') + '\n'
                page_rows = _rows_from_tables(page)
                if not page_rows:
                    # таблица без линий-границ — реконструируем по словам
                    page_rows = _rows_from_words(page)
                result.rows.extend(page_rows)
        if not result.raw_text.strip():
            result.warnings.append('Текст не извлечён — вероятно скан, нужен OCR')
    except Exception as e:  # noqa: BLE001
        logger.exception('pdf_text extract failed')
        result.warnings.append(f'Ошибка чтения PDF: {e}')
    return result


def _rows_from_tables(page):
    """Строки из таблиц с границами (extract_tables)."""
    rows = []
    for table in page.extract_tables() or []:
        for row in table:
            cells = [c for c in (row or []) if c]
            if not cells or looks_like_header(cells):
                continue
            parsed = parse_table_row(cells)
            if parsed:
                rows.append(parsed)
    return rows


def _rows_from_words(page):
    """Строки-данные из текстового PDF без табличных границ.

    Слова группируем по Y в строки, а ВНУТРИ строки — в ячейки по
    горизонтальному зазору (см. _cells_by_x_gap): узкий зазор — это разделитель
    тысяч одного числа («105 000»), широкий — граница колонки. Так соседние
    ценовые колонки «105 000 105 000 210 000» дают три цены, а не одно число-
    монстр 10^17 (координаты надёжнее, чем угадывать тысячи по числу цифр).
    Берём только строки с ценой — отсекаются заголовки/преамбула.
    """
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    if not words:
        return []
    # масштаб шрифта = медианная высота слова; от неё пляшем пороги Y и X-зазора
    heights = sorted(w['bottom'] - w['top'] for w in words if w['bottom'] > w['top'])
    h = heights[len(heights) // 2] if heights else 6.0
    rows = []
    for row_words in _group_words_by_y(words, y_tol=h * 0.6):
        cells = _cells_by_x_gap(row_words, gap=h * 0.6)
        if looks_like_header(cells):
            continue
        cells = _drop_index_numbers(cells)
        parsed = parse_ocr_row(cells)
        if parsed and (parsed.price_resident is not None or parsed.price_nonresident is not None):
            rows.append(parsed)
    return rows


def _group_words_by_y(words, y_tol):
    """Сгруппировать слова pdfplumber в строки по вертикали (центр по Y)."""
    ws = sorted(words, key=lambda w: ((w['top'] + w['bottom']) / 2, w['x0']))
    rows, cur, cy = [], [], None
    for w in ws:
        c = (w['top'] + w['bottom']) / 2
        if cy is None or abs(c - cy) <= y_tol:
            cur.append(w)
            cy = c if cy is None else (cy + c) / 2
        else:
            rows.append(cur)
            cur, cy = [w], c
    if cur:
        rows.append(cur)
    return rows


def _cells_by_x_gap(row_words, gap):
    """Слова одной строки → ячейки по горизонтальному зазору.

    Слова сортируем по X; новый столбец начинается, когда зазор до следующего
    слова больше `gap`. Внутри ячейки слова склеиваются через пробел, поэтому
    разрядка тысяч («105 000») остаётся одним числом (to_number срежет пробел),
    а слова из разных колонок не слипаются.
    """
    ws = sorted(row_words, key=lambda w: w['x0'])
    cells, cur, prev_x1 = [], [ws[0]['text']], ws[0]['x1']
    for w in ws[1:]:
        if w['x0'] - prev_x1 > gap:
            cells.append(' '.join(cur))
            cur = [w['text']]
        else:
            cur.append(w['text'])
        prev_x1 = max(prev_x1, w['x1'])
    cells.append(' '.join(cur))
    return cells
