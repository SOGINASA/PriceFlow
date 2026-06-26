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
# Резидент: «для резидентов», а также «для граждан Республики Казахстан».
_RESIDENT_KEYS = ('резидент', 'граждан')
# Нерезидент проверяется ПЕРВЫМ, иначе «для иностранных граждан» уйдёт в резиденты.
_NONRESIDENT_KEYS = ('нерезидент', 'не резидент', 'non-resident', 'иностран')
_CODE_KEYS = ('код', 'code', 'артикул', 'шифр', 'мкб', 'тарификатор')
_INDEX_KEYS = ('№', 'n п/п', 'п/п', '№п/п')   # колонка-нумератор (1..N) — не цена
_PRICE_RE = re.compile(r'\d[\d\s.,]*')

# --- Распознавание валюты позиции (ТЗ 3.3 / 4.4) ---------------------------
# KZT — валюта по умолчанию, поэтому в детекте важны прежде всего USD/RUB.
# Совпадение по ГРАНИЦЕ СЛОВА (\b), иначе «зарубежья» → ложный RUB, «рубец» и т.п.
# Символы валют (₽ $ ₸) и однозначные коды матчатся как есть.
_CURRENCY_PATTERNS = (
    ('USD', re.compile(r'\$|\busd\b|долл', re.I)),
    # «руб», «руб.», «рубль/рублей» — но не «зарубежья» (нет \b перед руб) и не
    # «рубец/рубцовый» (после руб идёт е/ц, а не граница слова или «л»).
    ('RUB', re.compile(r'₽|\brub\b|\bруб(?:\b|л)', re.I)),
    ('KZT', re.compile(r'₸|\bkzt\b|тенге|\bтг\b', re.I)),
)
# Что вырезать из ячейки, чтобы распознать «число-цену» рядом с символом валюты.
_CURRENCY_STRIP_RE = re.compile(r'(?i)\$|₽|₸|usd|rub|kzt|руб\.?|долл\.?|тенге|тг\.?')


def detect_currency(texts, default: str = 'KZT') -> str:
    """Определить валюту по тексту ЦЕНОВЫХ ячеек/строки. Первая не-KZT валюта
    побеждает. Совпадение по границе слова, чтобы «зарубежья»/«рубец» в тексте
    не давали ложный RUB."""
    joined = ' '.join(str(t) for t in texts if t is not None)
    for currency, pat in _CURRENCY_PATTERNS:
        if pat.search(joined):
            return currency
    return default


def looks_like_price(cell) -> bool:
    """Ячейка — цена, даже если рядом символ валюты: '$120', '5 200 ₽', '12 500'."""
    cleaned = _CURRENCY_STRIP_RE.sub(' ', str(cell)).strip()
    if not cleaned or not re.fullmatch(r'[\d\s.,]+', cleaned):
        return False
    num = to_number(cleaned)
    return num is not None and num > 0


def _is_currency_only(cell) -> bool:
    """Ячейка состоит только из обозначения валюты ('$', 'USD', 'руб.')."""
    s = str(cell).strip()
    return bool(s) and _CURRENCY_STRIP_RE.fullmatch(s) is not None


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


_EMPTY_MAP = {'name': None, 'price_resident': None, 'price_nonresident': None, 'code': None}


_MIN_PRICE_MEDIAN = 100   # медиана колонки-цены ≥ 100 ₸ → отсекает «№ п/п», кол-во, ед.изм.


def _median(vals):
    s = sorted(vals)
    return s[len(s) // 2] if s else 0


def _detect_price_columns(rows, start, exclude, sample=60):
    """Определить ценовые колонки ПО СОДЕРЖИМОМУ (надёжнее спан-заголовков Excel).

    Колонка — ценовая, если в большинстве строк-данных это число-цена И медиана
    значений ≥ _MIN_PRICE_MEDIAN (так колонка-нумератор «1,2,3…» и количества
    не принимаются за цену). exclude — заведомо не-ценовые колонки (name/code/№).
    """
    counts, values, total = {}, {}, 0
    for r in rows[start:start + sample]:
        if not any(c is not None and str(c).strip() for c in r):
            continue
        total += 1
        for i, c in enumerate(r):
            if i in exclude or c is None or not looks_like_price(c):
                continue
            counts[i] = counts.get(i, 0) + 1
            values.setdefault(i, []).append(to_number(c) or 0)
    if not total:
        return []
    return sorted(i for i, n in counts.items()
                  if n / total >= 0.5 and _median(values[i]) >= _MIN_PRICE_MEDIAN)


def classify_columns(rows: List[list]):
    """Найти строку(и) заголовков и сопоставить индексы колонок.

    Устойчиво к: длинным преамбулам (заголовок не в первых строках), двухстрочным
    шапкам и ценовым колонкам без слова «цена» («для граждан РК» → резидент,
    определяется и по содержимому). Возвращает (header_index, col_map), где
    данные = rows[header_index + 1:].
    """
    # 1) строка-заголовок = первая (до 40) со словом-названием услуги И ≥2 колонками
    #    (≥2 непустых ячеек — чтобы не принять однострочный заголовок-титул
    #    «ПРЕЙСКУРАНТ цен на медицинские услуги» за шапку таблицы).
    header_row = None
    for idx, row in enumerate(rows[:40]):
        cells = [str(c).lower() if c is not None else '' for c in row]
        non_empty = [c for c in cells if c.strip()]
        if len(non_empty) >= 2 and any(any(k in c for k in _NAME_KEYS) for c in cells):
            header_row = idx
            break
    if header_row is None:
        return 0, dict(_EMPTY_MAP)

    # 2) объединяем шапку из текущей и следующей строки (многоуровневые заголовки)
    def low(row):
        return [str(c).lower() if c is not None else '' for c in row]
    h1 = low(rows[header_row])
    h2 = low(rows[header_row + 1]) if header_row + 1 < len(rows) else []
    width = max(len(h1), len(h2))
    merged = [((h1[i] if i < len(h1) else '') + ' ' + (h2[i] if i < len(h2) else '')).strip()
              for i in range(width)]

    col_map = dict(_EMPTY_MAP)
    exclude = set()
    res_hint, nonres_hint = set(), set()    # колонки, чья шапка намекает на резидент/нерезидент
    for i, c in enumerate(merged):
        if not c:
            continue
        if any(k in c for k in _INDEX_KEYS):
            exclude.add(i)                       # колонка «№ п/п» — не цена
        if col_map['name'] is None and any(k in c for k in _NAME_KEYS):
            col_map['name'] = i
        elif col_map['code'] is None and any(k in c for k in _CODE_KEYS):
            col_map['code'] = i
        # независимо (не elif): колонка с обоими ключами («граждан РК … а также
        # иностранцев») попадёт в оба множества → станет неоднозначной → резидент.
        if any(k in c for k in _NONRESIDENT_KEYS):
            nonres_hint.add(i)
        if any(k in c for k in _RESIDENT_KEYS):
            res_hint.add(i)

    # 3) начало данных: первая строка после шапки с текстом в колонке имени и числом
    data_start = header_row + 1
    name_i = col_map['name']
    for j in range(header_row + 1, min(header_row + 8, len(rows))):
        r = rows[j]
        nm = r[name_i] if (name_i is not None and name_i < len(r)) else None
        has_num = any(c is not None and looks_like_price(c) for k, c in enumerate(r) if k != name_i)
        if nm and str(nm).strip() and not str(nm).strip().replace('.', '').isdigit() and has_num:
            data_start = j
            break

    # 4) ценовые колонки — ПО СОДЕРЖИМОМУ (надёжнее спан-заголовков Excel),
    #    порядок резидент/нерезидент — по подсказкам шапки, иначе слева направо.
    exclude |= {col_map['name'], col_map['code']}
    exclude.discard(None)
    price_cols = _detect_price_columns(rows, data_start, exclude)
    # подсказку шапки засчитываем только если она ОДНОЗНАЧНА: «для граждан РК … а
    # также иностранцев» — одна цена для всех, содержит оба ключа → не подсказка.
    res_col = next((c for c in price_cols if c in res_hint and c not in nonres_hint), None)
    nonres_col = next((c for c in price_cols if c in nonres_hint and c not in res_hint), None)
    rest = [c for c in price_cols if c not in (res_col, nonres_col)]
    if res_col is None and rest:        # единственная/левая цена → резидентская
        res_col = rest.pop(0)
    if nonres_col is None and rest:
        nonres_col = rest.pop(0)
    col_map['price_resident'] = res_col
    col_map['price_nonresident'] = nonres_col

    return data_start - 1, col_map


def parse_table_row(cells: List[str]) -> Optional[RawRow]:
    """Разбор строки таблицы без явного заголовка: первая текстовая ячейка —
    название, числовые ячейки — цены (1-я резидент, 2-я нерезидент). Валюта
    определяется по ценовым ячейкам (ТЗ 4.4)."""
    name = None
    price_cells, currency_cells = [], []
    for c in cells:
        s = str(c).strip()
        if not s:
            continue
        if _is_currency_only(s):
            currency_cells.append(s)
        elif looks_like_price(s):
            price_cells.append(s)
        elif name is None and not s.isdigit():
            name = s
    if not name:
        return None
    prices = [to_number(c) for c in price_cells]
    return RawRow(
        service_name_raw=name,
        price_resident=prices[0] if prices else None,
        price_nonresident=prices[1] if len(prices) > 1 else None,
        currency=detect_currency(price_cells + currency_cells),
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
    name_parts, price_cells, currency_cells = [], [], []
    for c in cells:
        s = str(c).strip()
        if not s:
            continue
        if _is_currency_only(s):              # отдельный бокс «$» / «USD»
            currency_cells.append(s)
            continue
        if looks_like_price(s):               # ячейка-цена (в т.ч. с символом валюты)
            price_cells.append(s)
            continue
        name_parts.append(s)

    name = ' '.join(name_parts).strip(' .\t-—:')
    if not name or len(name) < 3:
        return None
    prices = [to_number(c) for c in price_cells]
    return RawRow(
        service_name_raw=name,
        price_resident=prices[0] if prices else None,
        price_nonresident=prices[1] if len(prices) > 1 else None,
        currency=detect_currency(price_cells + currency_cells),
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
    # валюта — по «хвосту» вокруг цены (символ может стоять до или после числа),
    # чтобы не зацепить буквы из названия услуги
    currency = detect_currency([line[max(0, last.start() - 2):]])
    return RawRow(service_name_raw=name, price_resident=price, currency=currency)
