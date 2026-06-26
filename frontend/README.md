# MedPartners — Frontend

Фронтенд системы автоматической обработки прайс-листов клиник-партнёров
(хакатон MedPartners, кейс MedArchive). Реализован на **React (CRA) + Tailwind
CSS + Zustand + React Router**.

## Запуск

```bash
npm install
npm start          # дев-сервер на http://localhost:3000
npm run build      # продакшн-сборка в build/
```

Для подключения бэкенда скопируйте `.env.example` → `.env.local` и укажите
`REACT_APP_API_URL`.

## Структура

```
src/
├── api/                 # слой доступа к REST API (эндпоинты из ТЗ, п.4.5)
│   ├── client.js        #   базовый fetch-клиент (baseURL из env)
│   └── index.js         #   services/partners/search/documents/matching
├── components/
│   ├── landing/         # секции лендинга (Hero, Pipeline, Features, …)
│   ├── layout/          # каркас приложения (Sidebar, Topbar, MobileNav)
│   ├── shared/          # переиспользуемое (ClinicSearch)
│   └── ui/              # примитивы (Logo, Field, FileIcon, StatTile, Toast…)
├── data/mock.js         # демо-данные (замещаются вызовами api/)
├── hooks/               # useReveal (анимация появления), useCountUp
├── i18n/                # переводы лендинга RU/KZ/EN + стор языка
├── lib/                 # утилиты (cn, форматтеры цен/чисел/файлов)
├── pages/
│   ├── LandingPage.jsx  # публичная главная
│   ├── auth/            # Login / Register / Biometric
│   └── app/             # Upload → Analyzing → Report / Search / Partner / Admin
└── store/               # Zustand: useAuthStore, useUploadStore
```

## Маршруты

| Путь | Экран |
|------|-------|
| `/` | Лендинг |
| `/login`, `/register`, `/biometric` | Авторизация и биометрия |
| `/app/upload` | Загрузка архива прайсов |
| `/app/analyzing` | Прогресс обработки |
| `/app/report` | Единый отчёт и сравнение цен |
| `/app/search` | Поиск по клиникам |
| `/app/partner/:id` | Карточка партнёра (прайс, контакты, дата) |
| `/app/admin` | Аналитика (только роль admin) |

## Подключение бэкенда

Вся работа с сервером инкапсулирована в [`src/api`](src/api). Методы 1:1
повторяют эндпоинты ТЗ (`GET /services`, `GET /partners/{id}/services`,
`GET /search`, `POST /documents/upload`, `GET /unmatched`, `POST /match` …).
Сейчас страницы используют демо-данные из `src/data/mock.js` — чтобы перейти
на реальный бэкенд, замените импорты mock-данных на соответствующие вызовы
из `src/api`.
