"""Извлечение из XLSX/XLS (ТЗ 4.2). openpyxl/pandas.

Обходим все листы книги, определяем строку заголовков (может быть не первой),
ищем колонки названия услуги и цен (резидент/нерезидент).
"""
import logging

from services.extractors import ExtractResult, RawRow
from services.extractors.row_parser import to_number, classify_columns

logger = logging.getLogger(__name__)


def extract(file_path: str) -> ExtractResult:
    result = ExtractResult()
    try:
        from openpyxl import load_workbook
    except ImportError:
        result.warnings.append('openpyxl не установлен')
        return result

    try:
        wb = load_workbook(file_path, data_only=True, read_only=True)
        for ws in wb.worksheets:
            rows = [[c for c in row] for row in ws.iter_rows(values_only=True)]
            if not rows:
                continue
            header_idx, col_map = classify_columns(rows)
            if col_map.get('name') is None:
                result.warnings.append(f'Лист "{ws.title}": не найдена колонка услуги')
                continue
            for r in rows[header_idx + 1:]:
                name = r[col_map['name']] if col_map['name'] < len(r) else None
                if not name or not str(name).strip():
                    continue
                result.raw_text += ' | '.join(str(c) for c in r if c is not None) + '\n'
                result.rows.append(RawRow(
                    service_name_raw=str(name).strip(),
                    price_resident=to_number(_cell(r, col_map.get('price_resident'))),
                    price_nonresident=to_number(_cell(r, col_map.get('price_nonresident'))),
                    service_code_source=_str(_cell(r, col_map.get('code'))),
                ))
    except Exception as e:  # noqa: BLE001
        logger.exception('xlsx extract failed')
        result.warnings.append(f'Ошибка чтения XLSX: {e}')
    return result


def _cell(row, idx):
    if idx is None or idx >= len(row):
        return None
    return row[idx]


def _str(v):
    return str(v).strip() if v is not None else None
