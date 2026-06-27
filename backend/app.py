import os

# Подхватываем backend/.env до чтения os.environ
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

from flask import Flask, jsonify
from flask_cors import CORS
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager

from config import get_config, Config
from models import db

migrate = Migrate()
jwt = JWTManager()


def _recover_orphaned_processing():
    """Док в статусе processing после рестарта процесса — заведомо осиротевший:
    обработка не переживает перезапуск (краш/убитый воркер/«database is locked»).
    Без этого он навсегда висит в processing — невидим в очередях и никогда не
    переобрабатывается. Помечаем как error с пометкой, чтобы всплыл в списке и
    чинился через `python recover_stuck.py`."""
    from models import PriceDocument, ParseStatus
    stuck = PriceDocument.query.filter_by(parse_status=ParseStatus.PROCESSING).all()
    if not stuck:
        return
    for doc in stuck:
        doc.parse_status = ParseStatus.ERROR
        doc.parse_log = ((doc.parse_log + '\n') if doc.parse_log else '') + \
            'Обработка прервана (рестарт процесса) — переобработайте: recover_stuck.py'
    db.session.commit()
    print(f"[recover] осиротевших processing помечено error: {len(stuck)}")


def _ensure_columns():
    """Лёгкая авто-миграция: добавляет новые колонки в уже существующие таблицы
    (users.partner_id, partners.description), чтобы не требовать пересоздания БД.
    Для полноценных миграций используйте Flask-Migrate (flask db migrate)."""
    from sqlalchemy import inspect, text
    insp = inspect(db.engine)
    tables = set(insp.get_table_names())
    wanted = [
        ('users', 'partner_id', 'VARCHAR(36)'),
        ('partners', 'description', 'VARCHAR(1000)'),
        ('price_items', 'match_method', 'VARCHAR(20)'),
    ]
    for table, column, ddl in wanted:
        if table not in tables:
            continue
        existing = {c['name'] for c in insp.get_columns(table)}
        if column in existing:
            continue
        try:
            db.session.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {ddl}'))
            db.session.commit()
            print(f"[migrate] added {table}.{column}")
        except Exception as e:  # noqa: BLE001
            db.session.rollback()
            print(f"[migrate] skip {table}.{column}: {e}")


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    CORS(app, supports_credentials=True, origins=Config.CORS_ORIGINS)

    # Папки хранилища (оригиналы не удаляются — ТЗ 4.1 / 5)
    for d in (Config.STORAGE_DIR, Config.ARCHIVE_DIR, Config.EXTRACTED_DIR):
        os.makedirs(d, exist_ok=True)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    with app.app_context():
        db.create_all()
        _ensure_columns()  # лёгкая авто-миграция новых колонок для уже созданных БД
        # Авто-сид при первом запуске (идемпотентно). В тестах не наполняем.
        if not app.config.get('TESTING'):
            try:
                from seed_data import seed_all
                seed_all()
            except Exception as e:  # noqa: BLE001 — сид не должен ронять старт
                print(f"[seed] skipped: {e}")
            _recover_orphaned_processing()

        # Закрыть ВСЕ стартовые соединения пула. На SQLite каждая транзакция
        # открывается как BEGIN IMMEDIATE (write-lock). Если idle-соединение из
        # пула осталось с незакрытой транзакцией (а под reloader/venv-стабом
        # процессов несколько, и reloader-родитель создаёт app, но запросов не
        # обслуживает — просто сидит с открытым пулом), такой коннект пинит
        # write-lock SQLite навсегда → все последующие записи ждут busy_timeout и
        # падают с "database is locked". dispose() гарантированно отдаёт локи;
        # рабочему процессу соединения переоткроются лениво на первом запросе.
        db.engine.dispose()

    # --- Регистрация блюпринтов ---
    from routes.catalog import catalog_bp
    from routes.upload import upload_bp
    from routes.services import services_bp
    from routes.partners import partners_bp
    from routes.search import search_bp
    from routes.review import review_bp
    from routes.dashboard import dashboard_bp
    from routes.analytics import analytics_bp
    from routes.admin import admin_bp
    from routes.rates import rates_bp
    from routes.docs import docs_bp
    from routes.partner_portal import portal_bp

    app.register_blueprint(docs_bp, url_prefix='/api')           # /api/docs, /api/openapi.json
    app.register_blueprint(portal_bp, url_prefix='/api')         # /me, /me/items, /price-items/.../history
    app.register_blueprint(catalog_bp, url_prefix='/api/catalog')
    app.register_blueprint(upload_bp, url_prefix='/api/archives')
    app.register_blueprint(services_bp, url_prefix='/api/services')
    app.register_blueprint(partners_bp, url_prefix='/api/partners')
    app.register_blueprint(search_bp, url_prefix='/api/search')
    app.register_blueprint(review_bp, url_prefix='/api')          # /unmatched, /match, /verify
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(analytics_bp, url_prefix='/api/analytics')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(rates_bp, url_prefix='/api/rates')

    # SQLite: GET-запросы открываем как DEFERRED (read-транзакция, без write-lock),
    # пишущие — как IMMEDIATE. Иначе поллинг (дашборд/архивы) во время загрузки
    # конкурирует за единственный write-lock и ловит "database is locked".
    from flask import request
    from models import set_tx_mode

    @app.before_request
    def _tx_mode_by_method():
        set_tx_mode('DEFERRED' if request.method in ('GET', 'HEAD', 'OPTIONS') else 'IMMEDIATE')

    @app.teardown_request
    def _tx_mode_reset(_exc=None):
        set_tx_mode('IMMEDIATE')  # вернуть безопасный дефолт для переиспользуемого треда

    @app.route('/api')
    def health():
        return jsonify({'service': 'MedArchive API', 'status': 'ok'})

    _register_cli(app)
    return app


def _register_cli(app):
    """CLI-команды (ТЗ 4.1 — приём архива через CLI помимо интерфейса).

    Использование:
        flask --app app ingest <путь к .zip | папке | файлу> [--partner NAME] [--city CITY]
        flask --app app ingest archive.zip --async   # поставить в очередь Celery
    """
    import click

    @app.cli.command('ingest')
    @click.argument('path')
    @click.option('--partner', default=None, help='Явное название клиники на все файлы')
    @click.option('--city', default=None, help='Город клиники')
    @click.option('--async', 'async_', is_flag=True, default=False,
                  help='Поставить в очередь Celery вместо синхронной обработки')
    def ingest(path, partner, city, async_):
        """Принять прайсы из ZIP-архива, папки или одиночного файла и обработать."""
        from services.archive_service import ingest_path
        from services.tasks import process_document_sync

        doc_ids = ingest_path(path, enqueue=async_, partner_name=partner, city=city)
        click.echo(f'Принято документов: {len(doc_ids)}')
        if async_:
            click.echo('Документы поставлены в очередь Celery (нужен worker + Redis).')
            return

        for doc_id in doc_ids:
            process_document_sync(doc_id)
        if Config.AUTO_BUILD_CATALOG:
            try:
                from services import catalog_service
                catalog_service.build_catalog_from_items(
                    threshold=Config.CATALOG_CLUSTER_THRESHOLD, only_unmatched=True)
            except Exception as e:  # noqa: BLE001
                click.echo(f'[catalog] пропущено: {e}')

        from models import PriceDocument
        for doc_id in doc_ids:
            doc = db.session.get(PriceDocument, doc_id)
            if doc:
                click.echo(f'  {doc.file_name}: {doc.parse_status}, позиций {doc.items.count()}')
        click.echo('Готово.')

    return app


app = create_app()


if __name__ == '__main__':
    # Reloader ВЫКЛ по умолчанию: с venv-launcher'ом он плодил вложенные процессы
    # (4 шт.), каждый со своим пулом соединений к одному dev.db — лишняя
    # конкуренция за write-lock SQLite и риск утечки незакрытой транзакции.
    # Включить автоперезагрузку при необходимости: FLASK_RELOAD=1.
    use_reloader = os.environ.get('FLASK_RELOAD', '0') == '1'
    app.run(host='0.0.0.0', port=5252, debug=True, use_reloader=use_reloader)
