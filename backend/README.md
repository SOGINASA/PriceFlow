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

## Тесты

```bash
pytest
```

## TODO (следующие шаги)

- OpenAPI/Swagger (flask-smorest) — обязательно по ТЗ.
- Реальные курсы валют на дату прайса (НБ РК) вместо заглушки в `validation_service.FX_RATES`.
- PostgreSQL FTS вместо ILIKE в `routes/search.py`.
- Семантический матчинг (эмбеддинги) для повышения % автонормализации.
