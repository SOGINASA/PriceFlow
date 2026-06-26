"""Извлечение из DOCX (ТЗ 4.2). python-docx.

ВАЖНО: принять все tracked changes — работать с финальной версией текста.
python-docx по умолчанию отдаёт текст с принятыми вставками, но удалённый
текст (<w:del>) тоже может попадать в run'ы — поэтому чистим XML вставок/удалений.
"""
import logging

from services.extractors import ExtractResult, RawRow
from services.extractors.row_parser import parse_table_row, looks_like_header, parse_text_line

logger = logging.getLogger(__name__)


def _accept_tracked_changes(document):
    """Принять отслеживаемые изменения: убрать <w:del>, раскрыть <w:ins> (ТЗ 4.2)."""
    try:
        from docx.oxml.ns import qn
        body = document.element.body
        # удаляем удалённый автором текст
        for el in body.iter(qn('w:del')):
            el.getparent().remove(el)
    except Exception as e:  # noqa: BLE001
        logger.warning('accept tracked changes: %s', e)


def extract(file_path: str) -> ExtractResult:
    result = ExtractResult()
    try:
        from docx import Document
    except ImportError:
        result.warnings.append('python-docx не установлен')
        return result

    try:
        document = Document(file_path)
        _accept_tracked_changes(document)

        # таблицы
        for table in document.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells]
                cells = [c for c in cells if c]
                if not cells or looks_like_header(cells):
                    continue
                parsed = parse_table_row(cells)
                if parsed:
                    result.rows.append(parsed)

        # абзацы (на случай прайса без таблиц)
        for p in document.paragraphs:
            text = p.text.strip()
            if not text:
                continue
            result.raw_text += text + '\n'
            if not document.tables:
                parsed = parse_text_line(text)
                if parsed:
                    result.rows.append(parsed)
    except Exception as e:  # noqa: BLE001
        logger.exception('docx extract failed')
        result.warnings.append(f'Ошибка чтения DOCX: {e}')
    return result
