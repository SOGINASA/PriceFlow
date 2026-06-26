"""Извлечение из скана PDF через OCR (ТЗ 4.2). Tesseract + постобработка.

Лимит — не более 3 минут на документ (ТЗ 5). Для длинных сканов имеет смысл
распараллеливать страницы. Альтернатива Tesseract — облачные Vision/Textract.
"""
import logging
import re

from config import Config
from services.extractors import ExtractResult, RawRow
from services.extractors.row_parser import parse_text_line

logger = logging.getLogger(__name__)


def _clean_ocr_artifacts(text: str) -> str:
    """Постобработка артефактов OCR перед извлечением (ТЗ 4.2)."""
    text = text.replace('|', ' ')
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # частые подмены в цифрах: O->0, l->1 внутри числовых групп
    text = re.sub(r'(?<=\d)[OoОо](?=\d)', '0', text)
    return text


def extract(file_path: str) -> ExtractResult:
    result = ExtractResult()
    try:
        import pytesseract
        from pdf2image import convert_from_path
    except ImportError:
        result.warnings.append('pytesseract / pdf2image не установлены')
        return result

    if Config.TESSERACT_CMD:
        pytesseract.pytesseract.tesseract_cmd = Config.TESSERACT_CMD

    try:
        pages = convert_from_path(file_path, dpi=300)
        for img in pages:
            raw = pytesseract.image_to_string(img, lang=Config.OCR_LANGS)
            cleaned = _clean_ocr_artifacts(raw)
            result.raw_text += cleaned + '\n'
            for line in cleaned.splitlines():
                parsed = parse_text_line(line)
                if parsed:
                    result.rows.append(parsed)
        if not result.rows:
            result.warnings.append('OCR не дал распознаваемых строк прайса')
    except Exception as e:  # noqa: BLE001
        logger.exception('pdf_ocr extract failed')
        result.warnings.append(f'Ошибка OCR: {e}')
    return result
