"""Общие хелперы разбора строк прайса: эвристики колонок, чисел, заголовков.

Вынесено отдельно, чтобы все экстракторы (pdf/docx/xlsx/ocr) использовали
единую логику распознавания «название услуги + цена(ы)».
"""
import re
from typing import List, Optional

from services.extractors import RawRow

# ключевые слова для распознавания колонок
_NAME_KEYS = ('услуга', 'наименование', 'название', 'service', 'процедура', 'анализ')
_PRICE_KEYS = ('цена', 'стоимость', 'тариф', 'price', 'сум', 'тенге', 'kzt')
_RESIDENT_KEYS = ('резидент',)
_NONRESIDENT_KEYS = ('нерезидент', 'не резидент', 'non-resident', 'иностран')
_CODE_KEYS = ('код', 'code', 'артикул', 'шифр')
_PRICE_RE = re.compile(r'\d[\d\s.,]*')


def to_number(value) -> Optional[float]:
    """Привести ячейку к числу. '12 500,00' -> 12500.0; '1 200 тг' -> 1200.0."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value)
    m = _PRICE_RE.search(s.replace(' ', ' '))
    if not m:
        return None
    num = m.group(0).strip().replace(' ', '')
    # запятая как десятичный разделитель, точка как тысячный — нормализуем
    if ',' in num and '.' in num:
        num = num.replace('.', '').replace(',', '.')
    elif ',' in num:
        num = num.replace(',', '.')
    try:
        return float(num)
    except ValueError:
        return None


def looks_like_header(cells: List[str]) -> bool:
    joined = ' '.join(str(c).lower() for c in cells)
    return any(k in joined for k in _NAME_KEYS) and any(k in joined for k in _PRICE_KEYS)


def classify_columns(rows: List[list]):
    """Найти строку заголовков и сопоставить индексы колонок.

    Возвращает (header_index, {'name','price_resident','price_nonresident','code'}).
    """
    for idx, row in enumerate(rows[:15]):  # заголовок обычно в первых строках
        cells = [str(c).lower() if c is not None else '' for c in row]
        joined = ' '.join(cells)
        if not (any(k in joined for k in _NAME_KEYS) and any(k in joined for k in _PRICE_KEYS)):
            continue
        col_map = {'name': None, 'price_resident': None, 'price_nonresident': None, 'code': None}
        price_cols = []
        for i, c in enumerate(cells):
            if col_map['name'] is None and any(k in c for k in _NAME_KEYS):
                col_map['name'] = i
            elif any(k in c for k in _CODE_KEYS):
                col_map['code'] = i
            elif any(k in c for k in _PRICE_KEYS) or any(k in c for k in _RESIDENT_KEYS + _NONRESIDENT_KEYS):
                if any(k in c for k in _NONRESIDENT_KEYS):
                    col_map['price_nonresident'] = i
                elif any(k in c for k in _RESIDENT_KEYS):
                    col_map['price_resident'] = i
                else:
                    price_cols.append(i)
        # одиночная колонка цены → резидентская
        if col_map['price_resident'] is None and price_cols:
            col_map['price_resident'] = price_cols[0]
            if col_map['price_nonresident'] is None and len(price_cols) > 1:
                col_map['price_nonresident'] = price_cols[1]
        return idx, col_map
    return 0, {'name': None, 'price_resident': None, 'price_nonresident': None, 'code': None}


def parse_table_row(cells: List[str]) -> Optional[RawRow]:
    """Разбор строки таблицы без явного заголовка: первая текстовая ячейка —
    название, числовые ячейки — цены (1-я резидент, 2-я нерезидент)."""
    name = None
    prices = []
    for c in cells:
        num = to_number(c)
        if num is not None and num > 0 and re.fullmatch(r'[\d\s.,]+', str(c).strip()):
            prices.append(num)
        elif name is None and str(c).strip() and not str(c).strip().isdigit():
            name = str(c).strip()
    if not name:
        return None
    return RawRow(
        service_name_raw=name,
        price_resident=prices[0] if prices else None,
        price_nonresident=prices[1] if len(prices) > 1 else None,
    )


def group_boxes_to_rows(boxes, y_tol: float = 10.0) -> List[List[str]]:
    """Сгруппировать боксы OCR в строки таблицы → список ЯЧЕЕК (по X) на строку.

    EasyOCR отдаёт фрагменты как (bbox, text[, conf]); bbox — 4 точки [x,y].
    Боксы с близкими центрами по Y — одна строка; внутри строки сортируем по X.
    Важно: каждая ячейка остаётся отдельной (не склеиваем в текст), поэтому
    соседние колонки цен '900' '15 000' '10 000' не слипаются в одно число.
    Чистая функция (без модели) — тестируема.
    """
    parsed = []
    for box in boxes:
        bbox, text = box[0], box[1]
        if not text or not str(text).strip():
            continue
        ys = [pt[1] for pt in bbox]
        xs = [pt[0] for pt in bbox]
        parsed.append((sum(ys) / len(ys), min(xs), str(text).strip()))

    parsed.sort(key=lambda t: t[0])  # сверху вниз
    rows = []
    current, cur_y = [], None
    for cy, x, text in parsed:
        if cur_y is None or abs(cy - cur_y) <= y_tol:
            current.append((x, text))
            cur_y = cy if cur_y is None else (cur_y + cy) / 2
        else:
            rows.append([t for _x, t in sorted(current)])
            current, cur_y = [(x, text)], cy
    if current:
        rows.append([t for _x, t in sorted(current)])
    return rows


def group_boxes_to_lines(boxes, y_tol: float = 10.0) -> List[str]:
    """Те же строки, но склеенные в текст (для raw_text/аудита)."""
    return [' '.join(cells) for cells in group_boxes_to_rows(boxes, y_tol)]


def parse_ocr_row(cells: List[str]) -> Optional[RawRow]:
    """Разбор строки таблицы из ячеек OCR: текстовые ячейки → название,
    числовые → цены по колонкам (1-я резидент, 2-я нерезидент).

    Так как каждая ячейка — отдельный бокс OCR, многоколоночные цены не слипаются.
    """
    name_parts, prices = [], []
    for c in cells:
        s = str(c).strip()
        if not s:
            continue
        # ячейка-цена: состоит только из цифр/разделителей и парсится в число
        if re.fullmatch(r'[\d\s.,]+', s):
            num = to_number(s)
            if num is not None and num > 0:
                prices.append(num)
            continue
        name_parts.append(s)

    name = ' '.join(name_parts).strip(' .\t-—:')
    if not name or len(name) < 3:
        return None
    return RawRow(
        service_name_raw=name,
        price_resident=prices[0] if prices else None,
        price_nonresident=prices[1] if len(prices) > 1 else None,
    )


def parse_text_line(line: str) -> Optional[RawRow]:
    """Разбор свободной строки 'Название услуги .... 12 500'."""
    line = line.strip()
    if len(line) < 3:
        return None
    nums = list(_PRICE_RE.finditer(line))
    if not nums:
        return None
    last = nums[-1]
    name = line[:last.start()].strip(' .\t-—:')
    if not name or len(name) < 3:
        return None
    price = to_number(last.group(0))
    if price is None or price <= 0:
        return None
    return RawRow(service_name_raw=name, price_resident=price)
