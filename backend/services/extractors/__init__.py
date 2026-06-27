"""
Извлечение данных из прайс-документов по форматам (ТЗ 4.2).

Каждый экстрактор реализует единый интерфейс:
    extract(file_path) -> ExtractResult
что позволяет добавлять новые форматы без изменения ядра (ТЗ 5 — масштабируемость).
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class RawRow:
    """Одна сырая строка прайса до нормализации."""
    service_name_raw: str
    price_resident: Optional[float] = None
    price_nonresident: Optional[float] = None
    currency: str = 'KZT'
    service_code_source: Optional[str] = None


@dataclass
class ExtractResult:
    rows: List[RawRow] = field(default_factory=list)
    raw_text: str = ''                       # сырой текст для аудита (raw_content)
    warnings: List[str] = field(default_factory=list)


def detect_format(file_path: str) -> str:
    """Определить тип файла (ТЗ 4.1). Скан-PDF отличается от текстового на этапе extract.

    Картинки (фото/скан прайса: png/jpg/jpeg/tiff/bmp) сразу относим к scan_pdf —
    идут через OCR. CSV разбираем как таблицу (тот же экстрактор, что и XLSX).
    """
    from models import FileFormat
    ext = file_path.lower().rsplit('.', 1)[-1]
    return {
        'pdf': FileFormat.PDF,
        'docx': FileFormat.DOCX,
        'doc': FileFormat.DOCX,
        'xlsx': FileFormat.XLSX,
        'xls': FileFormat.XLSX,
        'csv': FileFormat.XLSX,
        'png': FileFormat.SCAN_PDF,
        'jpg': FileFormat.SCAN_PDF,
        'jpeg': FileFormat.SCAN_PDF,
        'tif': FileFormat.SCAN_PDF,
        'tiff': FileFormat.SCAN_PDF,
        'bmp': FileFormat.SCAN_PDF,
    }.get(ext, FileFormat.PDF)


def get_extractor(file_format: str):
    """Фабрика экстракторов по формату.

    Импорт ленивый и пер-формат: разбор CSV/XLSX/DOCX/текстового PDF не тянет
    тяжёлые зависимости OCR (numpy/torch/easyocr) — они нужны только для scan_pdf.
    """
    from models import FileFormat
    if file_format == FileFormat.XLSX:
        from services.extractors import xlsx
        return xlsx.extract
    if file_format == FileFormat.DOCX:
        from services.extractors import docx
        return docx.extract
    if file_format == FileFormat.SCAN_PDF:
        from services.extractors import pdf_ocr
        return pdf_ocr.extract
    from services.extractors import pdf_text
    return pdf_text.extract
