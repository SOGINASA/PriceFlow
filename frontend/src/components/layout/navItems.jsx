// ---------- Заголовки топбара по экранам ----------
export const SCREEN_META = {
  upload: ["Новый анализ прайсов", "Загрузите архивы прайсов клиник-партнёров"],
  analyzing: ["Обработка", "MedPartners распознаёт и сравнивает позиции"],
  report: ["Отчёты", "Все обработанные отчёты по архивам прайсов"],
  search: ["Поиск по клиникам", "База клиник и внешние источники"],
  verification: ["Очередь верификации", "Сопоставление услуг и проверка аномалий цен"],
  partner: ["Карточка клиники", "Полный прайс, контакты и дата актуальности"],
  "my-prices": ["Мой прайс", "Добавляйте услуги, меняйте цены — история сохраняется"],
  "my-clinic": ["Моя клиника", "Профиль клиники, контакты и описание"],
  notifications: ["Уведомления", "События обработки, проверки и обновления цен"],
  admin: ["Аналитика платформы", "Статистика и состояние системы"],
};

// ---------- Пункты навигации рабочей области ----------
// roles — какие роли видят пункт (user | admin | partner).
// Используются и в сайдбаре, и в мобильной нижней панели.
export const NAV_ITEMS = [
  {
    key: "upload",
    to: "/app/upload",
    label: "Загрузка",
    roles: ["user", "admin"],
    icon: <path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />,
  },
  {
    key: "my-prices",
    to: "/app/my-prices",
    label: "Мой прайс",
    roles: ["partner"],
    icon: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3.5h6V6H9z" /><path d="M9 11h6M9 15h4" /></>,
  },
  {
    key: "my-clinic",
    to: "/app/my-clinic",
    label: "Моя клиника",
    roles: ["partner"],
    icon: <><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-6h6v6" /><path d="M12 7.5v3M10.5 9h3" /></>,
  },
  {
    key: "report",
    to: "/app/report",
    label: "Отчёты",
    roles: ["user", "admin"],
    icon: <><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  },
  {
    key: "search",
    to: "/app/search",
    label: "Поиск клиник",
    shortLabel: "Поиск",
    roles: ["user", "admin", "partner"],
    icon: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
  },
  {
    key: "verification",
    to: "/app/verification",
    label: "Верификация",
    shortLabel: "Ревью",
    roles: ["admin"],
    icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  },
  {
    key: "notifications",
    to: "/app/notifications",
    label: "Уведомления",
    roles: ["user", "admin", "partner"],
    icon: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  },
  {
    key: "admin",
    to: "/app/admin",
    label: "Аналитика",
    roles: ["admin"],
    icon: <path d="M3 13h4l2-6 3 12 2.5-8 1.5 4h5" />,
  },
];

// Видим ли пункт меню при данной роли.
export function canSee(item, role) {
  if (item.roles) return item.roles.includes(role);
  // обратная совместимость со старыми флагами
  if (item.adminOnly && role !== "admin") return false;
  if (item.staffOnly && role !== "admin") return false;
  return true;
}
