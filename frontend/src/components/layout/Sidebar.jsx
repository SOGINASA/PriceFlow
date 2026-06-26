import { Link, useNavigate } from "react-router-dom";
import Logo from "../ui/Logo";
import useAuthStore from "../../store/useAuthStore";
import { NAV_ITEMS, canSee } from "./navItems";

// ---------- Боковая навигация (десктоп) ----------
export default function Sidebar({ screen }) {
  const navigate = useNavigate();
  const { user, role, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className="hidden lg:flex fixed top-0 left-0 bottom-0 w-[248px] z-10 flex-col p-[22px] px-4 border-r border-white/[.07]"
      style={{ background: "rgba(14,14,20,.7)", backdropFilter: "blur(22px)" }}
    >
      {/* Логотип → загрузка */}
      <Link to="/app/upload" className="flex items-center gap-[11px] px-2 py-[6px] mb-6">
        <Logo />
      </Link>

      <div className="text-[11px] font-bold tracking-[.1em] uppercase text-ink/30 px-[10px] mb-[10px]">Рабочая область</div>

      {/* Пункты меню */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.filter((item) => canSee(item, role)).map((item) => {
          const active = screen === item.key;
          return (
            <Link
              key={item.key}
              to={item.to}
              className="flex items-center gap-3 px-3 py-[11px] rounded-[11px] text-[14.5px] font-semibold transition-all border"
              style={{
                background: active ? "rgba(94,92,230,.14)" : "transparent",
                borderColor: active ? "rgba(94,92,230,.3)" : "transparent",
                color: active ? "#F5F5F7" : "rgba(245,245,247,.6)",
              }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                {item.icon}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* На сайт (лендинг) */}
      <Link to="/" className="flex items-center gap-3 mt-auto px-3 py-[11px] rounded-[11px] text-sm font-semibold text-ink/50 transition-all hover:bg-white/5 hover:text-ink">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
        </svg>
        На сайт
      </Link>

      {/* Профиль + выход */}
      <div className="pt-4 mt-[14px] border-t border-white/[.07]">
        <div className="flex items-center gap-[11px] p-2 rounded-xl">
          <div className="grid place-items-center w-[38px] h-[38px] rounded-[11px] font-display font-bold text-[15px] text-white shrink-0" style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)" }}>
            {(user?.name || "А").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13.5px] font-semibold truncate">{user?.name || "Гость"}</div>
            <div className="text-[11.5px] text-ink/45">{role === "admin" ? "Администратор" : role === "operator" ? "Оператор" : "Пользователь"}</div>
          </div>
          <button onClick={handleLogout} title="Выйти" className="grid place-items-center w-8 h-8 rounded-[9px] bg-white/5 border border-white/10 text-ink/60 transition-all hover:text-danger-soft hover:bg-danger/[.12]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
