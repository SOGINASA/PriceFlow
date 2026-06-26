import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import useUIStore from "../../store/useUIStore";
import { CLINICS } from "../../data/mock";
import { adminApi } from "../../api";
import { SCREEN_META } from "./navItems";

// ---------- Верхняя панель ----------
// Десктоп: заголовок + переключатель роли + колокольчик.
// Мобайл: компактный app-хедер — заголовок слева, колокольчик и аватар справа
// (аватар открывает профиль-шит). Учитывает safe-area сверху.
export default function Topbar({ screen }) {
  const navigate = useNavigate();
  const { user, role, partnerId, setRole, enterPartner, setSession } = useAuthStore();
  const { openProfile, unreadCount } = useUIStore();
  const [title, subtitle] = SCREEN_META[screen] || SCREEN_META.upload;

  // Смена роли (демо-переключатель). Для партнёра пробуем реальный вход в бэкенд
  // (демо-аккаунт клиники «Альфа»), при недоступности — локальный фолбэк.
  const changeRole = async (next) => {
    if (next === "partner") {
      try {
        const res = await adminApi.login({ username: "partner@alfa.kz", password: "partner123" });
        setSession({ user: { name: res.user?.full_name || "Партнёр", email: "partner@alfa.kz" }, role: "partner", token: res.access_token, partnerId: res.user?.partner_id || null });
      } catch {
        const cid = partnerId || "alpha";
        const clinic = CLINICS.find((c) => c.id === cid);
        enterPartner({ partnerId: cid, name: clinic?.name || "Клиника" });
      }
      navigate("/app/my-prices");
      return;
    }
    setRole(next);
    if (role === "partner" || (next === "user" && screen === "admin")) navigate("/app/upload");
  };

  // Колокольчик с бейджем непрочитанных.
  const Bell = ({ className }) => (
    <Link to="/app/notifications" className={`relative grid place-items-center w-10 h-10 rounded-[11px] bg-white/5 border border-white/10 text-ink/70 transition-colors hover:bg-white/[0.09] ${className || ""}`}>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {unreadCount > 0 && (
        <span className="absolute top-[7px] right-[8px] w-[8px] h-[8px] rounded-full bg-primary-400 shadow-[0_0_7px_#6E8BFF] outline outline-2 outline-[#0B0B12]" />
      )}
    </Link>
  );

  return (
    <header
      className="sticky top-0 z-[9] flex items-center justify-between px-[30px] py-4 max-lg:px-4 border-b border-white/[0.06] bg-[rgba(8,8,12,0.7)] backdrop-blur-[18px]"
      style={{ paddingTop: "max(16px, env(safe-area-inset-top))" }}
    >
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-xl max-lg:text-[18px] tracking-[-.015em] truncate">{title}</h1>
        <p className="text-[13px] text-ink/45 mt-[2px] max-lg:hidden">{subtitle}</p>
      </div>

      {/* Десктоп: роль + колокольчик */}
      <div className="hidden lg:flex items-center gap-[14px]">
        <div className="flex items-center gap-[3px] p-[3px] rounded-[11px] bg-white/5 border border-white/[.08]">
          {[["user", "Пользователь"], ["partner", "Партнёр"], ["admin", "Админ"]].map(([key, label]) => {
            const on = role === key;
            return (
              <button
                key={key}
                onClick={() => changeRole(key)}
                className={`font-semibold text-[12.5px] px-3 py-[6px] rounded-lg transition-all ${on ? "bg-primary/90 text-white" : "bg-transparent text-ink/50"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <Bell />
      </div>

      {/* Мобайл: колокольчик + аватар (открывает профиль) */}
      <div className="flex lg:hidden items-center gap-[10px]">
        <Bell />
        <button
          onClick={openProfile}
          className="grid place-items-center w-10 h-10 rounded-full font-display font-bold text-[14px] text-white bg-brand"
        >
          {(user?.name || "Г").charAt(0)}
        </button>
      </div>
    </header>
  );
}
