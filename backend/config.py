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

    # Авто-формирование справочника из прайсов по мере загрузки (ТЗ §7): если
    # организатор не дал готовый справочник, система сама добавляет «чистые»
    # названия услуг при обработке документа. Коды/мусор и неоднозначное остаются
    # в очереди unmatched для оператора. Порог склейки похожих названий в синонимы.
    AUTO_BUILD_CATALOG = os.environ.get('AUTO_BUILD_CATALOG', 'true').lower() in ('1', 'true', 'yes')
    CATALOG_CLUSTER_THRESHOLD = int(os.environ.get('CATALOG_CLUSTER_THRESHOLD', 90))

    # === Семантическое сопоставление (дообучение, уровень 2 — ВКЛ по умолчанию) ===
    # Доп. tier нормализации: если точное/нечёткое сопоставление не дотянуло до
    # порога, ищем ближайшую услугу по эмбеддингам (sentence-transformers, косинус).
    # Ловит перефразы/порядок слов/раскрытие аббревиатур, которые fuzzy пропускает,
    # и устойчив к части мусора OCR/PDF (контекст важнее посимвольных ошибок).
    # Модель грузится лениво (~один раз), эмбеддинги справочника кэшируются.
    # Отключить можно SEMANTIC_MATCH_ENABLED=false (например, для слабого железа).
    SEMANTIC_MATCH_ENABLED = os.environ.get('SEMANTIC_MATCH_ENABLED', 'true').lower() in ('1', 'true', 'yes')
    SEMANTIC_MODEL = os.environ.get('SEMANTIC_MODEL', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')
    SEMANTIC_THRESHOLD = float(os.environ.get('SEMANTIC_THRESHOLD', 0.70))  # косинус 0..1 для автосопоставления

    # === LLM-канонизация справочника (дедуп синонимов, ТЗ 4.3) ===
    # Консолидация справочника (POST /catalog/consolidate) сводит дубликаты-синонимы
    # к каноническому названию через LLM. Провайдер — OpenAI-совместимый (по умолч.
    # Groq). Без ключа используется офлайн-нормализация (склейка вариантов порядка
    # слов/пунктуации). Ключ задаётся в .env (GROQ_API_KEY), в репозиторий не кладём.
    GROQ_API_KEY = os.environ.get('GROQ_API_KEY', '')
    GROQ_BASE_URL = os.environ.get('GROQ_BASE_URL', 'https://api.groq.com/openai/v1')
    GROQ_MODEL = os.environ.get('GROQ_MODEL', 'llama-3.3-70b-versatile')
    LLM_BATCH_SIZE = int(os.environ.get('LLM_BATCH_SIZE', 60))

    # === Валидация цен ===
    PRICE_ANOMALY_PCT = float(os.environ.get('PRICE_ANOMALY_PCT', 0.50))  # отклонение >50% → аномалия

    # === Конвертация валют (ТЗ 4.4) ===
    # При True парсер сам тянет курс на дату прайса из API НБ РК, если его нет
    # в таблице exchange_rates. По умолчанию выключено — обработка офлайн и
    # детерминирована; курсы наполняются через POST /api/rates/refresh или сид.
    FX_AUTO_FETCH = os.environ.get('FX_AUTO_FETCH', 'false').lower() in ('1', 'true', 'yes')

    # === OCR (EasyOCR) ===
    # Языки EasyOCR через запятую. Казахский отдельного кода не имеет, но русская
    # модель покрывает кириллицу, поэтому по умолчанию ['ru','en'].
    OCR_LANGS = [s.strip() for s in os.environ.get('OCR_LANGS', 'ru,en').split(',') if s.strip()]
    OCR_GPU = os.environ.get('OCR_GPU', 'false').lower() in ('1', 'true', 'yes')
    OCR_DPI = int(os.environ.get('OCR_DPI', 300))  # рендер PDF->картинка; 300 — чётче мелкий шрифт

    # === Админ-раздел ===
    ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'MedArchive@2025')


class DevelopmentConfig(Config):
    DEBUG = True


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)
    SEMANTIC_MATCH_ENABLED = False   # в тестах не грузим тяжёлую модель эмбеддингов


config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig,
}


def get_config():
    return config[os.environ.get('FLASK_ENV') or 'default']
