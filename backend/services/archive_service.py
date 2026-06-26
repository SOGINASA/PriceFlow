"""Приём и распаковка ZIP-архива прайсов (ТЗ 4.1).

- сохраняем оригинал архива (не удаляется),
- распаковываем в storage/extracted/<doc batch>,
- для каждого файла создаём PriceDocument в статусе pending,
- пытаемся угадать партнёра и дату по имени файла,
- ставим документы в очередь обработки (Celery).
"""
import os
import re
import zipfile
import logging
from datetime import datetime

from config import Config
from models import db, Partner, PriceDocument, ParseStatus
from services.extractors import detect_format

logger = logging.getLogger(__name__)

_SUPPORTED = ('.pdf', '.docx', '.doc', '.xlsx', '.xls')
_DATE_RE = re.compile(r'(20\d{2})[-_.]?(\d{2})[-_.]?(\d{2})')


def _guess_date(file_name: str):
    m = _DATE_RE.search(file_name)
    if not m:
        return None
    try:
        return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3))).date()
    except ValueError:
        return None


def _guess_partner_name(file_name: str) -> str:
    base = os.path.splitext(os.path.basename(file_name))[0]
    base = _DATE_RE.sub('', base)
    return re.sub(r'[_\-]+', ' ', base).strip() or 'Неизвестный партнёр'


def _get_or_create_partner(name: str) -> Partner:
    partner = Partner.query.filter(db.func.lower(Partner.name) == name.lower()).first()
    if not partner:
        partner = Partner(name=name)
        db.session.add(partner)
        db.session.flush()
    return partner


def ingest_archive(zip_path: str, enqueue=True):
    """Распаковать архив и создать PriceDocument'ы. Возвращает список doc_id."""
    batch = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    out_dir = os.path.join(Config.EXTRACTED_DIR, batch)
    os.makedirs(out_dir, exist_ok=True)

    doc_ids = []
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            if member.endswith('/') or not member.lower().endswith(_SUPPORTED):
                continue
            safe_name = os.path.basename(member)
            target = os.path.join(out_dir, safe_name)
            with zf.open(member) as src, open(target, 'wb') as dst:
                dst.write(src.read())

            partner = _get_or_create_partner(_guess_partner_name(safe_name))
            doc = PriceDocument(
                partner_id=partner.partner_id,
                file_name=safe_name,
                file_path=target,
                file_format=detect_format(safe_name),
                effective_date=_guess_date(safe_name),
                parse_status=ParseStatus.PENDING,
            )
            db.session.add(doc)
            db.session.flush()
            doc_ids.append(doc.doc_id)

    db.session.commit()

    if enqueue:
        from services.tasks import process_document
        for doc_id in doc_ids:
            try:
                process_document.delay(doc_id)
            except Exception as e:  # noqa: BLE001 — Celery/Redis может быть не поднят в dev
                logger.warning('Не удалось поставить в очередь %s: %s', doc_id, e)

    return doc_ids
