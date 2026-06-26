import os
from datetime import timedelta

# Корень backend
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BACKEND_DIR, 'storage')          # оригиналы загруженных файлов (не удаляются)
ARCHIVE_DIR = os.path.join(STORAGE_DIR, 'archives')          # загруженные ZIP-архивы
EXTRACTED_DIR = os.path.join(STORAGE_DIR, 'extracted')       # распакованные документы клиник


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # === База данных ===
    # По умолчанию PostgreSQL (см. docker-compose). DATABASE_URL приоритетнее.
    # Локальный fallback на SQLite — только если Postgres недоступен.
    _db_url = os.environ.get('DATABASE_URL')
    if not _db_url:
        import sys
        # Папка под локальный SQLite-файл должна существовать, иначе sqlite3
        # бросит "unable to open database file".
        _sqlite_dir = os.path.join(BACKEND_DIR, 'database')
        os.makedirs(_sqlite_dir, exist_ok=True)
        print(
            "[WARNING] DATABASE_URL is not set. Using local SQLite fallback. "
            "For TZ compliance set DATABASE_URL=postgresql://...",
            file=sys.stderr,
        )
    SQLALCHEMY_DATABASE_URI = _db_url or f"sqlite:///{os.path.join(BACKEND_DIR, 'database', 'dev.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # === JWT (для операторов / админ-раздела) ===
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'dev-jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # === CORS ===
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
    ]

    # === Очередь обработки (Celery + Redis) ===
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL)
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL)

    # === Хранилище файлов ===
    STORAGE_DIR = STORAGE_DIR
    ARCHIVE_DIR = ARCHIVE_DIR
    EXTRACTED_DIR = EXTRACTED_DIR
    MAX_CONTENT_LENGTH = int(os.environ.get('MAX_CONTENT_LENGTH', 500 * 1024 * 1024))  # 500 MB на архив

    # === Нормализация / сопоставление со справочником ===
    # Порог автосопоставления (cosine similarity). Выше — авто, ниже — очередь на ревью.
    MATCH_AUTO_THRESHOLD = float(os.environ.get('MATCH_AUTO_THRESHOLD', 0.85))
    MATCH_SUGGEST_THRESHOLD = float(os.environ.get('MATCH_SUGGEST_THRESHOLD', 0.60))

    # === Валидация цен ===
    PRICE_ANOMALY_PCT = float(os.environ.get('PRICE_ANOMALY_PCT', 0.50))  # отклонение >50% → аномалия

    # === OCR ===
    TESSERACT_CMD = os.environ.get('TESSERACT_CMD')  # путь к tesseract, если не в PATH
    OCR_LANGS = os.environ.get('OCR_LANGS', 'rus+eng+kaz')

    # === Внешний LLM/OCR провайдер (опционально, для извлечения и нормализации) ===
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')

    # === Админ-раздел ===
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'MedArchive@2025')


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config():
    return config[os.environ.get('FLASK_ENV') or 'default']
