"""Наполнение БД учётками по умолчанию (+ опциональные демо-данные).

По умолчанию (в т.ч. авто-сид при старте, см. app.py) создаются ТОЛЬКО
необходимые учётные записи — администратор и оператор. Синтетические
демо-данные (клиники, справочник услуг, цены) автоматически НЕ создаются:
реальные данные появляются после загрузки прайсов, а справочник услуг
импортируется через POST /api/catalog/import.

seed_all() идемпотентен (учётки добавляются только если таблица users пуста),
поэтому его безопасно вызывать при каждом старте приложения.

Ручной запуск:  python seed_data.py            — досоздать недостающие учётки
                python seed_data.py --demo     — дополнительно засеять демо-данные
                python seed_data.py --reset     — пересоздать БД с нуля (только учётки)
                python seed_data.py --reset --demo  — чистая БД + демо-данные
"""
from datetime import date, timedelta

from models import (
    db, User, Role, Service, Partner, PriceDocument, PriceItem, PriceItemHistory,
    ParseStatus, FileFormat, Currency,
)

# ---------------------------------------------------------------------------
# Необходимые учётные записи (email, ФИО, роль, пароль).
# Только admin/operator: вход в систему идёт через POST /api/admin/login,
# который принимает роли operator|admin, поэтому обычные user-аккаунты
# залогиниться всё равно не могут и в сид не входят.
# ---------------------------------------------------------------------------
DEFAULT_USERS = [
    ('admin@medarchive.kz',    'Администратор системы',   Role.ADMIN,    'admin123'),
    ('operator@medarchive.kz', 'Оператор верификации',    Role.OPERATOR, 'operator123'),
]

# Партнёрские аккаунты: (email, ФИО, пароль, название клиники для привязки)
DEFAULT_PARTNER_USERS = [
    ('partner@alfa.kz', 'Кабинет · Клиника «Альфа»', 'partner123', 'Клиника «Альфа»'),
    ('partner@city.kz', 'Кабинет · Медцентр «Сити»', 'partner123', 'Медцентр «Сити»'),
]

# ---------------------------------------------------------------------------
# Демо-справочник услуг: (название, категория, синонимы, базовая цена KZT).
# Используется только при ручном засеве демо-данных (seed_demo / --demo).
# ---------------------------------------------------------------------------
SERVICES = [
    ('Общий анализ крови',           'лаборатория',  ['ОАК', 'клинический анализ крови'],            3500),
    ('Биохимический анализ крови',   'лаборатория',  ['биохимия крови', 'БАК'],                      6800),
    ('Анализ мочи общий',            'лаборатория',  ['ОАМ', 'общий анализ мочи'],                   2200),
    ('Гликированный гемоглобин',     'лаборатория',  ['HbA1c', 'гликогемоглобин'],                   4100),
    ('УЗИ органов брюшной полости',  'диагностика',  ['УЗИ ОБП', 'ультразвук брюшной полости'],     9500),
    ('УЗИ щитовидной железы',        'диагностика',  ['УЗИ щитовидки'],                              7200),
    ('Электрокардиография',          'диагностика',  ['ЭКГ', 'ЭКГ с расшифровкой'],                  4500),
    ('МРТ головного мозга',          'диагностика',  ['магнитно-резонансная томография головы'],   28000),
    ('Рентген грудной клетки',       'диагностика',  ['рентгенография ОГК', 'флюорография'],         5400),
    ('Консультация терапевта',       'консультация', ['приём терапевта', 'осмотр терапевта'],        6500),
    ('Консультация кардиолога',      'консультация', ['приём кардиолога'],                           9800),
    ('Консультация эндокринолога',   'консультация', ['приём эндокринолога'],                        9200),
    ('Внутримышечная инъекция',      'процедура',    ['в/м инъекция', 'укол внутримышечно'],         1500),
    ('Удаление зуба',                'процедура',    ['экстракция зуба'],                            12000),
]

# ---------------------------------------------------------------------------
# Демо-клиники: (название, город, адрес, БИН, email, телефон, множитель цен).
# Используются только при ручном засеве демо-данных (seed_demo / --demo).
# ---------------------------------------------------------------------------
PARTNERS = [
    ('Клиника «Альфа»',   'Алматы',    'пр. Достык 132',        '010140001234', 'info@alfa.kz',    '+7 727 350 1200', 1.00),
    ('Медцентр «Сити»',   'Астана',    'ул. Кунаева 14',        '020240005678', 'info@city.kz',    '+7 717 240 3300', 0.92),
    ('«Здоровье+»',       'Шымкент',   'пр. Тауке хана 88',     '030340009012', 'info@health.kz',  '+7 725 244 5500', 0.85),
    ('«Медикер»',         'Караганда', 'ул. Ерубаева 41',       '040440003456', 'info@mediker.kz', '+7 721 242 7700', 1.12),
    ('«Сұңқар Мед»',      'Алматы',    'мкр. Самал-2, д. 33',   '050540007890', 'info@sunqar.kz',  '+7 727 311 9900', 0.96),
]


def _seed_users():
    if User.query.first():
        return 0
    for email, name, role, password in DEFAULT_USERS:
        u = User(email=email, full_name=name, role=role)
        u.set_password(password)
        db.session.add(u)
    return len(DEFAULT_USERS)


def _seed_services():
    """Вернуть {название: Service}. Если справочник уже есть — просто читаем его."""
    existing = {s.service_name: s for s in Service.query.all()}
    if existing:
        return existing
    out = {}
    for name, category, synonyms, _base in SERVICES:
        svc = Service(service_name=name, category=category, synonyms=synonyms)
        db.session.add(svc)
        out[name] = svc
    db.session.flush()
    return out


def _round_price(v):
    return round(v / 50) * 50  # округляем до 50 тг как в реальных прайсах


def _seed_partners_and_prices(services):
    if Partner.query.first():
        return 0, 0
    base_by_name = {name: base for name, _c, _s, base in SERVICES}
    today = date.today()
    items_total = 0

    for p_idx, (name, city, addr, bin_, email, phone, mult) in enumerate(PARTNERS):
        partner = Partner(name=name, city=city, address=addr, bin=bin_,
                          contact_email=email, contact_phone=phone, is_active=True)
        db.session.add(partner)
        db.session.flush()

        eff = today - timedelta(days=20 + p_idx * 5)
        # один партнёр оставим на ревью для демонстрации очереди
        status = ParseStatus.NEEDS_REVIEW if p_idx == 3 else ParseStatus.DONE
        fmt = [FileFormat.XLSX, FileFormat.DOCX, FileFormat.PDF, FileFormat.SCAN_PDF, FileFormat.XLSX][p_idx]
        doc = PriceDocument(
            partner_id=partner.partner_id,
            file_name=f"{name.replace('«', '').replace('»', '').strip().replace(' ', '_')}_{eff.isoformat()}.{ 'pdf' if 'pdf' in fmt else fmt }",
            file_format=fmt,
            effective_date=eff,
            parse_status=status,
            parsed_at=None,
            parse_log='Демо-документ (seed)',
        )
        db.session.add(doc)
        db.session.flush()

        # каждый партнёр оказывает часть услуг (сдвиг по индексу для разнообразия)
        offered = [s for i, s in enumerate(SERVICES) if (i + p_idx) % 4 != 0]
        for s_idx, (svc_name, _cat, _syn, _base) in enumerate(offered):
            base = base_by_name[svc_name]
            resident = _round_price(base * mult)
            nonresident = _round_price(resident * 1.2)
            item = PriceItem(
                doc_id=doc.doc_id,
                partner_id=partner.partner_id,
                service_id=services[svc_name].service_id,
                service_name_raw=svc_name,
                price_resident_kzt=resident,
                price_nonresident_kzt=nonresident,
                price_original=resident,
                currency_original=Currency.KZT,
                match_score=1.0,
                is_verified=(status == ParseStatus.DONE),
                effective_date=eff,
                is_active=True,
            )
            db.session.add(item)
            db.session.flush()
            items_total += 1

            # демонстрация конвертации валют (ТЗ 4.4): позиция в USD у первого
            # партнёра — оригинал в долларах, цена пересчитана по курсу на дату
            if p_idx == 0 and s_idx == 0:
                from services import currency_service as fx
                usd = 120
                db.session.add(PriceItem(
                    doc_id=doc.doc_id,
                    partner_id=partner.partner_id,
                    service_id=services['МРТ головного мозга'].service_id,
                    service_name_raw='МРТ головного мозга (прайс в USD)',
                    price_resident_kzt=fx.convert_to_kzt(usd, Currency.USD, eff),
                    price_nonresident_kzt=fx.convert_to_kzt(round(usd * 1.2), Currency.USD, eff),
                    price_original=usd,
                    currency_original=Currency.USD,
                    match_score=1.0,
                    is_verified=True,
                    effective_date=eff,
                    is_active=True,
                ))
                items_total += 1

            # демонстрация версионирования: для первой услуги добавим историю
            if s_idx == 0:
                db.session.add(PriceItemHistory(
                    item_id=item.item_id,
                    price_resident_kzt=_round_price(resident * 0.9),
                    price_nonresident_kzt=_round_price(nonresident * 0.9),
                    effective_date=eff - timedelta(days=180),
                    reason='superseded_by_new_document',
                ))

            # демонстрация аномалии цены (>50% скачок) у одного партнёра
            if p_idx == 1 and s_idx == 1:
                item.has_anomaly = True
                item.is_verified = False

        # несопоставленные позиции (очередь unmatched) — у двух партнёров
        if p_idx in (0, 2):
            for raw in (f'Услуга-{p_idx}-XR-117 (нестандартное название)',
                        'Комплекс «Чекап Premium»'):
                db.session.add(PriceItem(
                    doc_id=doc.doc_id,
                    partner_id=partner.partner_id,
                    service_id=None,
                    service_name_raw=raw,
                    price_resident_kzt=_round_price(15000 * mult),
                    currency_original=Currency.KZT,
                    match_score=0.0,
                    effective_date=eff,
                    is_active=True,
                ))
                items_total += 1

    return len(PARTNERS), items_total


def _seed_partner_users():
    """Создать аккаунты партнёров и привязать к клиникам (по названию).
    Идемпотентно по email — добавляет даже в уже наполненную БД."""
    added = 0
    for email, name, password, clinic_name in DEFAULT_PARTNER_USERS:
        clinic = Partner.query.filter_by(name=clinic_name).first()
        if not clinic:
            continue
        user = User.query.filter(db.func.lower(User.email) == email.lower()).first()
        if not user:
            user = User(email=email, full_name=name, role=Role.PARTNER)
            user.set_password(password)
            db.session.add(user)
            added += 1
        # всегда поддерживаем привязку и роль актуальными
        user.role = Role.PARTNER
        user.partner_id = clinic.partner_id
    return added


def seed_all():
    """Идемпотентно создать ТОЛЬКО необходимые учётные записи (админ/оператор).

    Демо-данные (клиники/услуги/цены) здесь НЕ создаются — это делает seed_demo().
    """
    users = _seed_users()
    db.session.commit()
    if users:
        print(f"[seed] users_added={users}")
    return {'users_added': users}


def _seed_exchange_rates():
    """Базовые (фолбэк) курсы валют на старую дату — чтобы конвертация по дате
    прайса работала офлайн. Реальные курсы НБ РК подтягиваются через
    POST /api/rates/refresh. Идемпотентно (upsert)."""
    from services import currency_service as fx
    return fx.seed_fallback_rates()


def seed_demo():
    """Засеять синтетические демо-данные (справочник, клиники, цены) — по запросу.

    Идемпотентно: блоки наполняются только если соответствующая таблица пуста.
    """
    rates = _seed_exchange_rates()           # курсы нужны до создания позиций в USD
    services = _seed_services()
    partners, items = _seed_partners_and_prices(services)
    db.session.flush()  # партнёры должны существовать до привязки аккаунтов
    partner_users = _seed_partner_users()
    db.session.commit()
    summary = {
        'partner_users_added': partner_users,
        'services_total': len(services),
        'partners_added': partners,
        'price_items_added': items,
        'exchange_rates_added': rates,
    }
    print(f"[seed:demo] {summary}")
    return summary


if __name__ == '__main__':
    import sys
    from app import create_app

    app = create_app()
    with app.app_context():
        if '--reset' in sys.argv:
            print('[seed] DROP ALL + CREATE ALL ...')
            db.drop_all()
            db.create_all()
        seed_all()
        if '--demo' in sys.argv:
            seed_demo()
        print('[seed] done. Учётки:')
        for email, _n, role, pw in DEFAULT_USERS:
            print(f'   {role:8} {email}  /  {pw}')
