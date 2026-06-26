// ---------- Заголовки топбара по экранам ----------
export const SCREEN_META = {
  upload: ["Новый анализ прайсов", "Загрузите архивы прайсов клиник-партнёров"],
  analyzing: ["Обработка", "MedPartners распознаёт и сравнивает позиции"],
  report: ["Единый отчёт", "Результат обработки готов к экспорту"],
  search: ["Поиск по клиникам", "База клиник и внешние источники"],
  verification: ["Очередь верификации", "Сопоставление услуг и проверка аномалий цен"],
  partner: ["Карточка клиники", "Полный прайс, контакты и дата актуальности"],
  admin: ["Аналитика платформы", "Статистика и состояние системы"],
};

// ---------- Пункты навигации рабочей области ----------
// Используются и в сайдбаре, и в мобильной нижней панели.
// adminOnly: пункт виден только администратору.
// staffOnly: пункт виден оператору и администратору.
export const NAV_ITEMS = [
  {
    key: "upload",
    to: "/app/upload",
    label: "Загрузка",
    icon: <path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />,
  },
  {
    key: "report",
    to: "/app/report",
    label: "Отчёты",
    icon: <><path d="M5 4h14v16H5z" /><path d="M9 9h6M9 13h6M9 17h3" /></>,
  },
  {
    key: "search",
    to: "/app/search",
    label: "Поиск клиник",
    shortLabel: "Поиск",
    icon: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
  },
  {
    key: "verification",
    to: "/app/verification",
    label: "Верификация",
    shortLabel: "Ревью",
    staffOnly: true,
    icon: <><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  },
  {
    key: "admin",
    to: "/app/admin",
    label: "Аналитика",
    adminOnly: true,
    icon: <path d="M3 13h4l2-6 3 12 2.5-8 1.5 4h5" />,
  },
];

// Видим ли пункт меню при данной роли.
export function canSee(item, role) {
  if (item.adminOnly && role !== "admin") return false;
  if (item.staffOnly && !["admin", "operator"].includes(role)) return false;
  return true;
}
