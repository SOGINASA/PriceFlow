"""Извлечение из скана PDF через OCR (ТЗ 4.2). EasyOCR + постобработка.

Без системных бинарей: EasyOCR — готовая предобученная нейросеть, страницы PDF
рендерим в картинку через PyMuPDF (fitz), poppler не нужен. Лимит — не более
3 минут на документ (ТЗ 5); reader загружается один раз на процесс.
"""
import logging
import re

import numpy as np

from config import Config
from services.extractors import ExtractResult
from services.extractors.row_parser import parse_ocr_row, group_boxes_to_rows

logger = logging.getLogger(__name__)

_reader = None  # ленивый синглтон easyocr.Reader (загрузка модели дорогая)


def _get_reader():
    """Создать (один раз) и вернуть EasyOCR Reader. None, если easyocr не установлен."""
    global _reader
    if _reader is None:
        import easyocr  # ленивый импорт — torch тяжёлый
        # verbose=False — не печатать прогресс-бар загрузки модели (символы ломают
        # консоль Windows cp1251 и засоряют лог в Docker).
        _reader = easyocr.Reader(Config.OCR_LANGS, gpu=Config.OCR_GPU, verbose=False)
    return _reader


def _clean_ocr_artifacts(text: str) -> str:
    """Постобработка артефактов OCR перед извлечением (ТЗ 4.2)."""
    text = text.replace('|', ' ')
    text = re.sub(r'[ \t]{2,}', ' ', text)
    # частые подмены в цифрах: O->0 внутри числовых групп
    text = re.sub(r'(?<=\d)[OoОо](?=\d)', '0', text)
    return text


def _to_grayscale(img: np.ndarray) -> np.ndarray:
    """RGB -> grayscale (numpy, без cv2). Убирает цветовой шум, помогает OCR."""
    if img.ndim == 2:
        return img
    r, g, b = img[:, :, 0], img[:, :, 1], img[:, :, 2]
    return (0.299 * r + 0.587 * g + 0.114 * b).astype(np.uint8)


def _render_pages(file_path: str):
    """PDF -> список изображений страниц (grayscale numpy) через PyMuPDF, без poppler.

    Рендерим на Config.OCR_DPI (по умолч. 300) — мелкий шрифт таблиц читается лучше,
    затем переводим в оттенки серого для снижения шума перед OCR.
    """
    import fitz  # PyMuPDF
    pages = []
    with fitz.open(file_path) as pdf:
        for page in pdf:
            pix = page.get_pixmap(dpi=Config.OCR_DPI)
            img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
            if pix.n >= 3:
                img = _to_grayscale(img[:, :, :3])
            else:
                img = img.reshape(pix.height, pix.width)
            pages.append(img)
    return pages


def extract(file_path: str) -> ExtractResult:
    result = ExtractResult()
    try:
        reader = _get_reader()
    except ImportError:
        result.warnings.append('easyocr не установлен — поставьте requirements.txt')
        return result

    try:
        for img in _render_pages(file_path):
            # detail=1 -> [(bbox, text, conf)]; нужны bbox для раскладки по колонкам
            boxes = reader.readtext(img, detail=1, paragraph=False)
            for cells in group_boxes_to_rows(boxes):
                cells = [_clean_ocr_artifacts(c) for c in cells]
                result.raw_text += ' '.join(cells) + '\n'
                parsed = parse_ocr_row(cells)
                if parsed:
                    result.rows.append(parsed)
        if not result.rows:
            result.warnings.append('OCR не дал распознаваемых строк прайса')
    except Exception as e:  # noqa: BLE001
        logger.exception('pdf_ocr extract failed')
        result.warnings.append(f'Ошибка OCR: {e}')
    return result
