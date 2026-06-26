"""Загрузка архива прайсов и статус обработки (ТЗ 4.1, 4.6).

POST /api/archives            — загрузить ZIP, поставить документы в очередь
GET  /api/archives/{doc_id}   — статус конкретного документа
GET  /api/archives            — список документов с фильтром по статусу
"""
import os
import logging
from datetime import datetime

from flask import Blueprint, request, jsonify

from config import Config
from models import db, PriceDocument, ParseStatus
from services.archive_service import ingest_archive, ingest_files

logger = logging.getLogger(__name__)
upload_bp = Blueprint('archives', __name__)


@upload_bp.route('', methods=['POST'])
def upload_archive():
    """Принять прайсы: либо ZIP-архив (поле 'file'), либо отдельные файлы (поле 'files').

    Query: sync=1 — обработать синхронно (без Celery/Redis, удобно для демо).
    """
    enqueue = request.args.get('sync') != '1'

    f = request.files.get('file')
    loose = request.files.getlist('files')

    if f and f.filename.lower().endswith('.zip'):
        os.makedirs(Config.ARCHIVE_DIR, exist_ok=True)
        saved = os.path.join(Config.ARCHIVE_DIR,
                             f"{datetime.utcnow():%Y%m%d_%H%M%S}_{f.filename}")
        f.save(saved)
        doc_ids = ingest_archive(saved, enqueue=enqueue)
        source = os.path.basename(saved)
    elif loose:
        doc_ids = ingest_files(loose, enqueue=enqueue)
        source = f'{len(loose)} файл(ов)'
    else:
        return jsonify({'error': "Ожидается ZIP в поле 'file' или файлы в поле 'files'"}), 400

    if not enqueue:  # синхронная обработка для dev/демо
        from services.tasks import process_document_sync
        for doc_id in doc_ids:
            process_document_sync(doc_id)

    return jsonify({'source': source, 'documents': len(doc_ids), 'doc_ids': doc_ids}), 201


@upload_bp.route('', methods=['GET'])
def list_documents():
    status = request.args.get('status')
    q = PriceDocument.query
    if status:
        q = q.filter_by(parse_status=status)
    docs = q.order_by(PriceDocument.created_at.desc()).limit(500).all()
    return jsonify([d.to_dict() for d in docs])


@upload_bp.route('/<doc_id>', methods=['GET'])
def document_status(doc_id):
    doc = db.session.get(PriceDocument, doc_id)
    if not doc:
        return jsonify({'error': 'Документ не найден'}), 404
    data = doc.to_dict(include_raw=request.args.get('raw') == '1')
    data['items_count'] = doc.items.count()
    return jsonify(data)
