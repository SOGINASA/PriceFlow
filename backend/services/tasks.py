"""Очередь обработки документов (ТЗ 4.1 — очередь со статусами).

Celery — основной режим (worker + Redis). Если celery не установлен (быстрый
офлайн-старт, CLI, тесты), модуль всё равно импортируется, а обработку можно
прогнать синхронно через process_document_sync — см. README «Запуск локально».
"""
import logging

from config import Config

logger = logging.getLogger(__name__)

try:
    from celery import Celery
    _HAS_CELERY = True
except ImportError:                       # celery не установлен — только синхронный режим
    Celery = None
    _HAS_CELERY = False


def process_document_sync(doc_id: str):
    """Синхронный прогон конвейера без Celery (dev / CLI / тесты)."""
    from services.pipeline_service import process_document as _p
    _p(doc_id)


if _HAS_CELERY:
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

else:
    celery_app = None

    def process_document(doc_id: str):
        """Фолбэк без Celery: у функции нет .delay, поэтому постановка в очередь
        (archive_service._enqueue) корректно деградирует в предупреждение, а
        обработка идёт синхронно через process_document_sync."""
        process_document_sync(doc_id)
