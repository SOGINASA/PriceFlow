"""Извлечение из текстового PDF (ТЗ 4.2). pdfplumber / PyMuPDF.

Если страница содержит мало текста, но является изображением — диспетчер
конвейера должен переключиться на pdf_ocr (см. pipeline_service).
"""
import logging

from services.extractors import ExtractResult, RawRow
from services.extractors.row_parser import parse_table_row, looks_like_header

logger = logging.getLogger(__name__)


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
                text = page.extract_text() or ''
                result.raw_text += text + '\n'
                for table in page.extract_tables() or []:
                    for row in table:
                        cells = [c for c in (row or []) if c]
                        if not cells or looks_like_header(cells):
                            continue
                        parsed = parse_table_row(cells)
                        if parsed:
                            result.rows.append(parsed)
        if not result.raw_text.strip():
            result.warnings.append('Текст не извлечён — вероятно скан, нужен OCR')
    except Exception as e:  # noqa: BLE001
        logger.exception('pdf_text extract failed')
        result.warnings.append(f'Ошибка чтения PDF: {e}')
    return result
