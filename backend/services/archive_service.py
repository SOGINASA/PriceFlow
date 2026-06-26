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


def _get_or_create_partner(name: str, city: str = None) -> Partner:
    partner = Partner.query.filter(db.func.lower(Partner.name) == name.lower()).first()
    if not partner:
        partner = Partner(name=name, city=city or None)
        db.session.add(partner)
        db.session.flush()
    elif city and not partner.city:
        # дозаполняем город, если у существующей клиники он ещё не указан
        partner.city = city
    return partner


def _create_document(file_path: str, file_name: str,
                     partner_name: str = None, city: str = None):
    """Создать PriceDocument из уже сохранённого файла (общий код для zip/loose).

    partner_name/city — явные значения из формы загрузки; если не заданы, имя
    клиники угадывается по имени файла (город остаётся пустым).
    """
    name = (partner_name or '').strip() or _guess_partner_name(file_name)
    partner = _get_or_create_partner(name, city)
    doc = PriceDocument(
        partner_id=partner.partner_id,
        file_name=file_name,
        file_path=file_path,
        file_format=detect_format(file_name),
        effective_date=_guess_date(file_name),
        parse_status=ParseStatus.PENDING,
    )
    db.session.add(doc)
    db.session.flush()
    return doc.doc_id


def _enqueue(doc_ids):
    from services.tasks import process_document
    for doc_id in doc_ids:
        try:
            process_document.delay(doc_id)
        except Exception as e:  # noqa: BLE001 — Redis может быть не поднят в dev
            logger.warning('Не удалось поставить в очередь %s: %s', doc_id, e)


def ingest_files(file_storages, enqueue=True, partner_name=None, city=None):
    """Принять отдельные прайс-файлы (не в архиве). Возвращает список doc_id.

    partner_name/city — явная клиника из формы загрузки (на все файлы пачки).
    """
    batch = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    out_dir = os.path.join(Config.EXTRACTED_DIR, batch)
    os.makedirs(out_dir, exist_ok=True)

    doc_ids = []
    for fs in file_storages:
        name = os.path.basename(fs.filename or '')
        if not name.lower().endswith(_SUPPORTED):
            continue
        target = os.path.join(out_dir, name)
        fs.save(target)
        doc_ids.append(_create_document(target, name, partner_name, city))

    db.session.commit()
    if enqueue:
        _enqueue(doc_ids)
    return doc_ids


def ingest_archive(zip_path: str, enqueue=True, partner_name=None, city=None):
    """Распаковать архив и создать PriceDocument'ы. Возвращает список doc_id.

    partner_name/city — явная клиника из формы загрузки (на все файлы архива).
    """
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
            doc_ids.append(_create_document(target, safe_name, partner_name, city))

    db.session.commit()
    if enqueue:
        _enqueue(doc_ids)
    return doc_ids
