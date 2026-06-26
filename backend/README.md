# MedArchive — Backend

Автоматическая обработка архива прайс-листов клиник-партнёров: извлечение данных
из PDF/DOCX/XLSX/сканов, нормализация к справочнику услуг, верификация и API поиска.
(ТЗ Кейс 2, Med Partners)

## Стек

- **Flask** + Flask-SQLAlchemy + Flask-Migrate + Flask-JWT-Extended
- **PostgreSQL** (FTS, jsonb), SQLite — fallback для быстрого старта
- **Celery + Redis** — очередь обработки документов
- Извлечение: `pdfplumber` / `PyMuPDF`, `python-docx`, `openpyxl`, `easyocr` (OCR сканов)
- Нормализация: `rapidfuzz` (+ опц. `sentence-transformers`)

## Структура

```
app.py                  фабрика приложения, регистрация блюпринтов
config.py               конфиг (БД, пороги матчинга, OCR, хранилище)
models.py               Service, Partner, PriceDocument, PriceItem, PriceItemHistory
routes/                 API-блюпринты (catalog, archives, services, partners, search, review, dashboard, admin)
services/
  archive_service.py    приём ZIP, распаковка, создание документов
  pipeline_service.py   оркестрация: extract → validate → normalize → save
  normalization_service.py  сопоставление со справочником (fuzzy/threshold)
  validation_service.py     проверки цен, аномалии, версионирование, валюты
  tasks.py              Celery-таски
  extractors/           pdf_text, pdf_ocr, xlsx, docx, row_parser
storage/                оригиналы файлов и распакованные документы (не удаляются)
tests/                  дымовые тесты
```

## Запуск (Docker — рекомендуется)

```bash
cp .env.example .env
docker compose up --build      # поднимет postgres, redis, backend, celery worker
```

## Запуск локально (быстрый старт, без Docker)

```bash
python -m venv .venv && source .venv/Scripts/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# Закомментируйте DATABASE_URL в .env → будет SQLite fallback
cp .env.example .env
python seed_data.py            # демо-справочник
python app.py                  # http://localhost:5252/api
```

> OCR работает на EasyOCR — системные бинари (Tesseract/poppler) не нужны. На первом
> запуске EasyOCR один раз скачает веса моделей (~80 МБ на язык) в кэш, дальше — офлайн.
> Без Redis загрузку архива можно обрабатывать синхронно: `POST /api/archives?sync=1`.

## Основные эндпоинты

| Метод | URL | Назначение |
|-------|-----|-----------|
| POST | `/api/catalog/import` | загрузка целевого справочника (JSON/XLSX) |
| POST | `/api/archives` | загрузка ZIP-архива прайсов |
| GET | `/api/archives/{doc_id}` | статус обработки документа |
| GET | `/api/services?category=` | справочник услуг |
| GET | `/api/services/{id}/partners` | кто оказывает услугу и по какой цене |
| GET | `/api/partners?city=` | партнёры |
| GET | `/api/partners/{id}/services` | прайс партнёра |
| GET | `/api/search?q=` | полнотекстовый поиск |
| GET | `/api/unmatched` | очередь несопоставленных позиций |
| GET | `/api/needs-review` | аномалии для верификации |
| POST | `/api/match` | ручное сопоставление позиции с услугой |
| POST | `/api/verify` | подтвердить/отклонить/скорректировать |
| GET | `/api/dashboard/stats` | метрики обработки и % нормализации |
| GET | `/api/rates?currency=` | сохранённые курсы валют к KZT |
| POST | `/api/rates` | задать курс вручную `{currency, date, rate}` |
| POST | `/api/rates/refresh` | подтянуть курсы НБ РК `{date}` или `{start,end}` |
| GET | `/api/rates/convert?amount=&currency=&date=` | превью пересчёта в KZT |

## Тесты

```bash
pytest
```

## Конвертация валют (ТЗ 4.4)

Цены в валюте, отличной от KZT, пересчитываются в тенге **по курсу на дату прайса**
(`effective_date`), а оригинал сохраняется в `price_original` / `currency_original`.

- Валюта позиции распознаётся при парсинге (`$`/`USD`/`долл`, `₽`/`RUB`/`руб`,
  `₸`/`KZT`/`тенге`) — см. `row_parser.detect_currency`.
- Пересчёт — `services/currency_service.py`: курс берётся из таблицы
  `exchange_rates` на дату прайса или ближайшую предшествующую (курс НБ РК
  действует до следующей публикации).
- Источник курсов — API НБ РК. При `FX_AUTO_FETCH=true` парсер сам тянет курс
  на дату; иначе курсы наполняются через `POST /api/rates/refresh` или
  задаются вручную. Если курсов нет и нет сети — статический фолбэк
  `currency_service.STATIC_FALLBACK` (офлайн-демо/тесты).

```bash
# подтянуть курсы НБ РК за период
curl -X POST localhost:5252/api/rates/refresh -H 'Content-Type: application/json' \
     -d '{"start":"2025-01-01","end":"2025-12-31"}'
# превью пересчёта 120 USD по курсу на 2025-03-01
curl 'localhost:5252/api/rates/convert?amount=120&currency=USD&date=2025-03-01'
```

## TODO (следующие шаги)

- OpenAPI/Swagger (flask-smorest) — обязательно по ТЗ.
- PostgreSQL FTS вместо ILIKE в `routes/search.py`.
- Семантический матчинг (эмбеддинги) для повышения % автонормализации.
