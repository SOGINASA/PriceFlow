"""
Схема БД MedArchive (см. ТЗ Кейс 2, раздел 3).

Сущности:
    Service          — целевой справочник медицинских услуг
    Partner          — клиника-партнёр
    PriceDocument    — исходный прайс-документ одной клиники на дату
    PriceItem        — позиция прайса (услуга + цена), привязывается к Service
    PriceItemHistory — версионирование: архив старых значений цен (хранится бессрочно)

UUID-идентификаторы хранятся как строки (db.String(36)) для совместимости
SQLite/PostgreSQL. На Postgres при желании можно перейти на native UUID.
"""
import uuid
from datetime import datetime, timezone, date

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


def _uuid():
    return str(uuid.uuid4())


def _utc_now():
    return datetime.now(timezone.utc)


def _iso(dt):
    if dt is None:
        return None
    if isinstance(dt, datetime):
        s = dt.isoformat()
        if not s.endswith('Z') and '+' not in s:
            s += 'Z'
        return s
    return dt.isoformat()


# ---------------------------------------------------------------------------
# 3.4 Услуга справочника (Service)
# ---------------------------------------------------------------------------
class Service(db.Model):
    __tablename__ = 'services'

    service_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    service_name = db.Column(db.String(500), nullable=False, index=True)
    synonyms = db.Column(db.JSON, default=list)          # array<string>
    category = db.Column(db.String(120), index=True)     # лаборатория / диагностика / консультация / процедура ...
    icd_code = db.Column(db.String(20))                  # код по МКБ (опционально)
    is_active = db.Column(db.Boolean, default=True)

    items = db.relationship('PriceItem', backref='service', lazy='dynamic')

    def to_dict(self):
        return {
            'service_id': self.service_id,
            'service_name': self.service_name,
            'synonyms': self.synonyms or [],
            'category': self.category,
            'icd_code': self.icd_code,
            'is_active': self.is_active,
        }


# ---------------------------------------------------------------------------
# 3.1 Партнёр (Partner)
# ---------------------------------------------------------------------------
class Partner(db.Model):
    __tablename__ = 'partners'

    partner_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    name = db.Column(db.String(500), nullable=False, index=True)
    city = db.Column(db.String(120), index=True)
    address = db.Column(db.String(500))
    bin = db.Column(db.String(12), index=True)           # БИН организации (для дедупликации)
    contact_email = db.Column(db.String(120))
    contact_phone = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=_utc_now)
    updated_at = db.Column(db.DateTime, default=_utc_now, onupdate=_utc_now)

    documents = db.relationship('PriceDocument', backref='partner', lazy='dynamic')
    items = db.relationship('PriceItem', backref='partner', lazy='dynamic')

    def to_dict(self):
        return {
            'partner_id': self.partner_id,
            'name': self.name,
            'city': self.city,
            'address': self.address,
            'bin': self.bin,
            'contact_email': self.contact_email,
            'contact_phone': self.contact_phone,
            'is_active': self.is_active,
            'created_at': _iso(self.created_at),
            'updated_at': _iso(self.updated_at),
        }


# ---------------------------------------------------------------------------
# 3.2 Прайс-документ (PriceDocument)
# ---------------------------------------------------------------------------
class FileFormat:
    PDF = 'pdf'
    DOCX = 'docx'
    XLSX = 'xlsx'
    SCAN_PDF = 'scan_pdf'
    ALL = (PDF, DOCX, XLSX, SCAN_PDF)


class ParseStatus:
    PENDING = 'pending'
    PROCESSING = 'processing'
    DONE = 'done'
    ERROR = 'error'
    NEEDS_REVIEW = 'needs_review'
    ALL = (PENDING, PROCESSING, DONE, ERROR, NEEDS_REVIEW)


class PriceDocument(db.Model):
    __tablename__ = 'price_documents'

    doc_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    partner_id = db.Column(db.String(36), db.ForeignKey('partners.partner_id'), index=True)
    file_name = db.Column(db.String(500), nullable=False)
    file_path = db.Column(db.String(1000))               # путь к сохранённому оригиналу
    file_format = db.Column(db.String(20))               # FileFormat.*
    effective_date = db.Column(db.Date)                  # дата вступления прайса в силу
    parsed_at = db.Column(db.DateTime)
    parse_status = db.Column(db.String(20), default=ParseStatus.PENDING, index=True)
    parse_log = db.Column(db.Text)                       # лог ошибок и предупреждений
    raw_content = db.Column(db.Text)                     # сырой извлечённый текст (для аудита)
    created_at = db.Column(db.DateTime, default=_utc_now)

    items = db.relationship('PriceItem', backref='document', lazy='dynamic')

    def to_dict(self, include_raw=False):
        d = {
            'doc_id': self.doc_id,
            'partner_id': self.partner_id,
            'file_name': self.file_name,
            'file_format': self.file_format,
            'effective_date': _iso(self.effective_date),
            'parsed_at': _iso(self.parsed_at),
            'parse_status': self.parse_status,
            'parse_log': self.parse_log,
            'created_at': _iso(self.created_at),
        }
        if include_raw:
            d['raw_content'] = self.raw_content
        return d


# ---------------------------------------------------------------------------
# 3.3 Позиция прайса (PriceItem)
# ---------------------------------------------------------------------------
class Currency:
    KZT = 'KZT'
    USD = 'USD'
    RUB = 'RUB'
    ALL = (KZT, USD, RUB)


class PriceItem(db.Model):
    __tablename__ = 'price_items'

    item_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    doc_id = db.Column(db.String(36), db.ForeignKey('price_documents.doc_id'), index=True)
    partner_id = db.Column(db.String(36), db.ForeignKey('partners.partner_id'), index=True)  # денормализовано
    service_id = db.Column(db.String(36), db.ForeignKey('services.service_id'), nullable=True, index=True)

    service_name_raw = db.Column(db.String(1000), nullable=False)   # как в документе
    service_code_source = db.Column(db.String(120))                # код услуги из источника

    price_resident_kzt = db.Column(db.Numeric(14, 2))
    price_nonresident_kzt = db.Column(db.Numeric(14, 2))
    price_original = db.Column(db.Numeric(14, 2))
    currency_original = db.Column(db.String(8), default=Currency.KZT)

    # нормализация / верификация
    match_score = db.Column(db.Float)                    # уверенность автосопоставления
    is_verified = db.Column(db.Boolean, default=False)
    verification_note = db.Column(db.String(1000))

    effective_date = db.Column(db.Date)
    is_active = db.Column(db.Boolean, default=True, index=True)   # актуальная позиция (versioning)
    has_anomaly = db.Column(db.Boolean, default=False)           # флаг аномалии цены
    created_at = db.Column(db.DateTime, default=_utc_now)

    history = db.relationship('PriceItemHistory', backref='item', lazy='dynamic')

    def to_dict(self):
        return {
            'item_id': self.item_id,
            'doc_id': self.doc_id,
            'partner_id': self.partner_id,
            'service_id': self.service_id,
            'service_name_raw': self.service_name_raw,
            'service_code_source': self.service_code_source,
            'price_resident_kzt': float(self.price_resident_kzt) if self.price_resident_kzt is not None else None,
            'price_nonresident_kzt': float(self.price_nonresident_kzt) if self.price_nonresident_kzt is not None else None,
            'price_original': float(self.price_original) if self.price_original is not None else None,
            'currency_original': self.currency_original,
            'match_score': self.match_score,
            'is_verified': self.is_verified,
            'verification_note': self.verification_note,
            'effective_date': _iso(self.effective_date),
            'is_active': self.is_active,
            'has_anomaly': self.has_anomaly,
        }


# ---------------------------------------------------------------------------
# Версионирование цен (история хранится бессрочно — ТЗ 4.4 / 5)
# ---------------------------------------------------------------------------
class PriceItemHistory(db.Model):
    __tablename__ = 'price_item_history'

    history_id = db.Column(db.String(36), primary_key=True, default=_uuid)
    item_id = db.Column(db.String(36), db.ForeignKey('price_items.item_id'), index=True)
    price_resident_kzt = db.Column(db.Numeric(14, 2))
    price_nonresident_kzt = db.Column(db.Numeric(14, 2))
    effective_date = db.Column(db.Date)
    archived_at = db.Column(db.DateTime, default=_utc_now)
    reason = db.Column(db.String(255))                   # причина архивации (новая цена / дедуп / правка)

    def to_dict(self):
        return {
            'history_id': self.history_id,
            'item_id': self.item_id,
            'price_resident_kzt': float(self.price_resident_kzt) if self.price_resident_kzt is not None else None,
            'price_nonresident_kzt': float(self.price_nonresident_kzt) if self.price_nonresident_kzt is not None else None,
            'effective_date': _iso(self.effective_date),
            'archived_at': _iso(self.archived_at),
            'reason': self.reason,
        }
