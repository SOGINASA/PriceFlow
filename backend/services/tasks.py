"""Celery-очередь обработки документов (ТЗ 4.1 — очередь со статусами).

В dev без Redis можно вызывать pipeline синхронно (process_document_sync).
"""
import os
import logging

from celery import Celery

from config import Config

logger = logging.getLogger(__name__)

celery_app = Celery(
    'medarchive',
    broker=Config.CELERY_BROKER_URL,
    backend=Config.CELERY_RESULT_BACKEND,
)
celery_app.conf.update(task_track_started=True, task_time_limit=300)  # ТЗ: OCR ≤ 3 мин


def _run_in_app_context(doc_id: str):
    """Создать app-контекст (Celery worker — отдельный процесс) и прогнать конвейер."""
    from app import create_app
    from services.pipeline_service import process_document
    app = create_app()
    with app.app_context():
        process_document(doc_id)


@celery_app.task(name='medarchive.process_document', bind=True, max_retries=2)
def process_document(self, doc_id: str):
    try:
        _run_in_app_context(doc_id)
    except Exception as e:  # noqa: BLE001
        logger.exception('task process_document failed')
        raise self.retry(exc=e, countdown=10)


def process_document_sync(doc_id: str):
    """Синхронный прогон без Celery (для dev/тестов)."""
    from services.pipeline_service import process_document as _p
    _p(doc_id)
