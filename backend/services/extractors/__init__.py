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
    """Определить тип файла (ТЗ 4.1). Скан-PDF отличается от текстового на этапе extract."""
    from models import FileFormat
    ext = file_path.lower().rsplit('.', 1)[-1]
    return {
        'pdf': FileFormat.PDF,
        'docx': FileFormat.DOCX,
        'doc': FileFormat.DOCX,
        'xlsx': FileFormat.XLSX,
        'xls': FileFormat.XLSX,
    }.get(ext, FileFormat.PDF)


def get_extractor(file_format: str):
    """Фабрика экстракторов по формату."""
    from models import FileFormat
    from services.extractors import pdf_text, pdf_ocr, xlsx, docx
    return {
        FileFormat.PDF: pdf_text.extract,
        FileFormat.SCAN_PDF: pdf_ocr.extract,
        FileFormat.XLSX: xlsx.extract,
        FileFormat.DOCX: docx.extract,
    }.get(file_format, pdf_text.extract)
