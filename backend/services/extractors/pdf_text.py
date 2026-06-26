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
    parse_table_row, looks_like_header, group_boxes_to_rows, parse_ocr_row,
)

logger = logging.getLogger(__name__)

_MIN_WORD_PRICE = 100   # цена в ₸ ниже этого в word-fallback — это номер строки/мусор
_DIGITS = re.compile(r'^\d+$')


def _merge_thousands(cells):
    """Склеить разряды числа, разбитого пробелом-разделителем тысяч.

    pdfplumber бьёт «9 900» на ['9','900']. Правило: если следующая ячейка —
    ровно 3 цифры, она продолжение предыдущего числа. Так '9'+'900'→'9900',
    '15'+'000'→'15000', '1'+'234'+'567'→'1234567'. Две отдельные цены (4–5 цифр)
    не склеиваются, т.к. продолжение — именно 3 цифры."""
    out = []
    for c in cells:
        s = str(c).strip()
        if (out and _DIGITS.fullmatch(s) and len(s) == 3
                and _DIGITS.fullmatch(out[-1])):
            out[-1] = out[-1] + s
        else:
            out.append(s)
    return out


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

    Группируем слова по Y-координате (как OCR-боксы), разбираем каждую строку и
    берём только строки с ценой — так отсекаются заголовки/преамбула, которые в
    extract_text() склеиваются с данными в нечитаемом порядке.
    """
    words = page.extract_words(use_text_flow=False, keep_blank_chars=False)
    if not words:
        return []
    # допуск по Y — около половины высоты строки (слова одной строки ближе друг к другу)
    heights = sorted(w['bottom'] - w['top'] for w in words if w['bottom'] > w['top'])
    y_tol = (heights[len(heights) // 2] * 0.6) if heights else 3.0
    boxes = [([[w['x0'], w['top']], [w['x1'], w['top']],
              [w['x1'], w['bottom']], [w['x0'], w['bottom']]], w['text']) for w in words]
    rows = []
    for cells in group_boxes_to_rows(boxes, y_tol=y_tol):
        if looks_like_header(cells):
            continue
        cells = _drop_index_numbers(_merge_thousands(cells))
        parsed = parse_ocr_row(cells)
        if parsed and (parsed.price_resident is not None or parsed.price_nonresident is not None):
            rows.append(parsed)
    return rows
