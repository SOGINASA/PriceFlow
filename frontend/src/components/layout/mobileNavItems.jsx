// ---------- Пункты нижней навигации (мобайл) ----------
// У каждого пункта два варианта иконки: outline (неактивный) и solid
// (активный). Набор зависит от роли: партнёр видит свой кабинет.
// Профиль вынесен отдельно (открывает шит).

const UPLOAD = {
  key: "upload",
  to: "/app/upload",
  label: "Главная",
  outline: <path d="M12 16V4m0 0-4 4m4-4 4 4M5 20h14" />,
  solid: (
    <g fill="currentColor" stroke="none">
      <path d="M4 18a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Z" />
      <path d="M12 3a1 1 0 0 1 .7.3l5 5a1 1 0 0 1-1.4 1.4L13 6.4V15a1 1 0 0 1-2 0V6.4L7.7 9.7a1 1 0 0 1-1.4-1.4l5-5A1 1 0 0 1 12 3Z" />
    </g>
  ),
};

const SEARCH = {
  key: "search",
  to: "/app/search",
  label: "Поиск",
  outline: <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>,
  solid: <path fill="currentColor" stroke="none" d="M11 3a8 8 0 1 0 5.3 14l3.4 3.4a1 1 0 0 0 1.4-1.4L17.7 15.6A8 8 0 0 0 11 3Zm0 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z" />,
};

const REPORT = {
  key: "report",
  to: "/app/report",
  label: "Отчёт",
  outline: <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M9 8h6M9 12h6M9 16h3" /></>,
  solid: (
    <g fill="currentColor" stroke="none">
      <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M9 12h6M9 16h3.5" stroke="#08080C" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),
};

const ALERTS = {
  key: "notifications",
  to: "/app/notifications",
  label: "Алерты",
  outline: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  solid: <path fill="currentColor" stroke="none" d="M12 2a6 6 0 0 0-6 6c0 5-2.5 7-2.5 7h17S18 13 18 8a6 6 0 0 0-6-6Zm0 20a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" />,
};

// --- кабинет партнёра ---
const MY_PRICES = {
  key: "my-prices",
  to: "/app/my-prices",
  label: "Прайс",
  outline: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3.5h6V6H9z" /><path d="M9 11h6M9 15h4" /></>,
  solid: (
    <g fill="currentColor" stroke="none">
      <path d="M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
      <path d="M9 11h6M9 15h4" stroke="#08080C" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="9" y="3" width="6" height="3" rx="1" fill="#08080C" />
    </g>
  ),
};

const MY_CLINIC = {
  key: "my-clinic",
  to: "/app/my-clinic",
  label: "Клиника",
  outline: <><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-6h6v6" /><path d="M12 7.5v3M10.5 9h3" /></>,
  solid: (
    <g fill="currentColor" stroke="none">
      <path d="M3.6 9.2 12 5l8.4 4.2a1 1 0 0 1 .6.9V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10.1a1 1 0 0 1 .6-.9Z" />
      <path d="M12 7.2v3.4M10.3 8.9h3.4" stroke="#08080C" strokeWidth="1.5" strokeLinecap="round" />
    </g>
  ),
};

// Вернуть набор вкладок под роль.
export function getMobileNav(role) {
  if (role === "partner") return [MY_PRICES, MY_CLINIC, SEARCH, ALERTS];
  return [UPLOAD, SEARCH, REPORT, ALERTS];
}
