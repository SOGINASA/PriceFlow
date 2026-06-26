import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { SCREEN_META } from "./navItems";

// ---------- Верхняя панель ----------
// Заголовок экрана + переключатель роли (Пользователь / Админ) + колокольчик.
export default function Topbar({ screen }) {
  const navigate = useNavigate();
  const { role, setRole } = useAuthStore();
  const [title, subtitle] = SCREEN_META[screen] || SCREEN_META.upload;

  // Смена роли. Если уходим с админ-экрана в роль user — возвращаемся на загрузку.
  const changeRole = (next) => {
    setRole(next);
    if (next === "user" && screen === "admin") navigate("/app/upload");
  };

  return (
    <header
      className="sticky top-0 z-[9] flex items-center justify-between px-[30px] py-4 max-md:px-4 border-b border-white/[.06]"
      style={{ background: "rgba(8,8,12,.6)", backdropFilter: "blur(18px)" }}
    >
      <div>
        <h1 className="font-display font-semibold text-xl max-md:text-[17px] tracking-[-.015em]">{title}</h1>
        <p className="text-[13px] text-ink/45 mt-[2px] max-md:hidden">{subtitle}</p>
      </div>

      <div className="flex items-center gap-[14px]">
        {/* Переключатель роли */}
        <div className="flex items-center gap-[3px] p-[3px] rounded-[11px] bg-white/5 border border-white/[.08]">
          {[["user", "Пользователь"], ["admin", "Админ"]].map(([key, label]) => {
            const on = role === key;
            return (
              <button
                key={key}
                onClick={() => changeRole(key)}
                className="font-semibold text-[12.5px] max-md:text-[11.5px] px-3 max-md:px-[9px] py-[6px] rounded-lg transition-all"
                style={{ background: on ? "rgba(94,92,230,.9)" : "transparent", color: on ? "#fff" : "rgba(245,245,247,.5)" }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Уведомления */}
        <button className="grid place-items-center w-10 h-10 rounded-[11px] bg-white/5 border border-white/10 text-ink/70 relative max-md:hidden hover:bg-white/[.09]">
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full" style={{ background: "#6E8BFF", boxShadow: "0 0 7px #6E8BFF" }} />
        </button>
      </div>
    </header>
  );
}
