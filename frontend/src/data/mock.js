// ---------- Демо-данные ----------
// Временные данные из дизайна. Когда появится бэкенд — заменяются вызовами
// из src/api. Структура приближена к сущностям ТЗ (Partner, PriceItem, Service).

// Клиники-партнёры (сущность Partner). id и поля совместимы с будущим API.
export const CLINICS = [
  {
    id: "alpha",
    name: "Клиника «Альфа»",
    meta: "Алматы · Диагностика, МРТ · 312 услуг",
    city: "Алматы",
    from: "9 400",
    initial: "А",
    gradient: "linear-gradient(135deg,#6E8BFF,#5E5CE6)",
    keywords: "альфа almaty алматы мрт диагностика alfa",
  },
  {
    id: "city",
    name: "Медцентр «Сити»",
    meta: "Астана · Терапия, УЗИ · 540 услуг",
    city: "Астана",
    from: "7 100",
    initial: "С",
    gradient: "linear-gradient(135deg,#A78BFA,#5E5CE6)",
    keywords: "сити city астана терапия узи",
  },
  {
    id: "health",
    name: "«Здоровье+»",
    meta: "Шымкент · Стоматология · 198 услуг",
    city: "Шымкент",
    from: "5 200",
    initial: "З",
    gradient: "linear-gradient(135deg,#6E8BFF,#A78BFA)",
    keywords: "здоровье health шымкент shymkent стоматология",
  },
  {
    id: "mediker",
    name: "«Медикер»",
    meta: "Караганда · Кардиология · 421 услуга",
    city: "Караганда",
    from: "11 800",
    initial: "М",
    gradient: "linear-gradient(135deg,#5E5CE6,#7E7BFF)",
    keywords: "медикер mediker караганда karaganda кардиология",
  },
  {
    id: "sunqar",
    name: "«Сұңқар Мед»",
    meta: "Алматы · Педиатрия · 276 услуг",
    city: "Алматы",
    from: "6 300",
    initial: "С",
    gradient: "linear-gradient(135deg,#6E8BFF,#5E5CE6)",
    keywords: "сункар sunqar алматы almaty педиатрия",
  },
];

// Строки сравнения цен по услугам (для отчёта). best — клиника с лучшей ценой.
export const REPORT_ROWS = [
  { service: "МРТ головного мозга", alpha: "14 900", city: "18 200", health: "21 500", best: "alpha" },
  { service: "УЗИ брюшной полости", alpha: "11 200", city: "9 400", health: "12 800", best: "city" },
  { service: "Приём терапевта", alpha: "6 500", city: "7 100", health: "5 200", best: "health" },
  { service: "Общий анализ крови", alpha: "3 800", city: "3 200", health: "4 100", best: "city" },
  { service: "Рентген грудной клетки", alpha: "5 400", city: "6 800", health: "4 900", best: "health" },
  { service: "Консультация кардиолога", alpha: "9 800", city: "8 900", health: "11 200", best: "city" },
];

// Разброс цен на МРТ по 12 клиникам (тыс. ₸) — для графика отчёта.
export const REPORT_CHART = [20, 24, 28, 15, 22, 19, 26, 17, 21, 23, 18, 25];

// ---------- Список отчётов ----------
// Каждый отчёт — результат одной обработки архива. rows/chart переиспользуют
// демо-данные выше. При подключении бэкенда заменяется на reportsApi.list().
export const REPORTS = [
  {
    id: "r1",
    title: "Единый отчёт · Алматы",
    date: "26 июня 2026, 16:12",
    clinics: 12,
    items: 4218,
    files: 8,
    duration: "2.3 с",
    savings: 34,
    status: "done",
    rows: REPORT_ROWS,
    chart: REPORT_CHART,
  },
  {
    id: "r2",
    title: "Прайсы Q2 · Астана",
    date: "24 июня 2026, 11:40",
    clinics: 7,
    items: 2540,
    files: 5,
    duration: "1.6 с",
    savings: 28,
    status: "done",
    rows: REPORT_ROWS.slice(0, 4),
    chart: [18, 22, 26, 14, 20, 24, 17, 21, 19],
  },
  {
    id: "r3",
    title: "Стоматология · Шымкент",
    date: "21 июня 2026, 09:05",
    clinics: 4,
    items: 1180,
    files: 3,
    duration: "0.9 с",
    savings: 41,
    status: "done",
    rows: REPORT_ROWS.slice(2),
    chart: [12, 16, 14, 19, 11, 15, 13],
  },
  {
    id: "r4",
    title: "Кардиология · Караганда",
    date: "19 июня 2026, 18:33",
    clinics: 5,
    items: 1902,
    files: 4,
    duration: "1.2 с",
    savings: 23,
    status: "done",
    rows: REPORT_ROWS,
    chart: [22, 28, 24, 30, 19, 26, 21, 25],
  },
];

// Обработки за неделю (Пн–Вс) — график админ-панели.
export const ADMIN_WEEK_CHART = [120, 180, 150, 240, 290, 170, 210];

// Последние обработки (очередь задач) для админ-раздела.
export const ADMIN_JOBS = [
  { user: "Алия Нурлан", files: 8, items: "4 218", status: "Готово", time: "2 мин назад" },
  { user: "Данияр К.", files: 3, items: "1 540", status: "Готово", time: "14 мин назад" },
  { user: "Жанна Б.", files: 12, items: "6 902", status: "Обработка", time: "сейчас" },
  { user: "Тимур А.", files: 5, items: "2 110", status: "Готово", time: "42 мин назад" },
  { user: "Мадина С.", files: 2, items: "880", status: "Ошибка", time: "1 ч назад" },
];

// Демо-набор файлов для кнопки «Добавить демо-файлы» на экране загрузки.
export const DEMO_FILES = [
  { name: "Прайс_Альфа_2026.pdf", size: "2.4 МБ", type: "pdf" },
  { name: "Сити_услуги.xlsx", size: "860 КБ", type: "xls" },
  { name: "Здоровье_плюс_скан.jpg", size: "3.1 МБ", type: "img" },
  { name: "Медикер_прайс.csv", size: "124 КБ", type: "csv" },
];

// Журнал обработки (анимация на экране «Анализ»).
export const ANALYSIS_LOGS = [
  "Принято 8 файлов · 2 PDF, 3 XLSX, 2 скан, 1 CSV",
  "OCR · скан «Здоровье_плюс» → 312 строк",
  "Распознаны заголовки таблиц · 96 колонок",
  "Нормализация единиц: ₸, тенге, KZT → ₸",
  "Сопоставлено 1 204 названия услуг",
  "Дедупликация · удалено 86 дублей",
  "Сравнение цен по 12 клиникам…",
  "Найдена лучшая цена для 4 218 позиций",
  "Сборка единого отчёта · готово",
];
