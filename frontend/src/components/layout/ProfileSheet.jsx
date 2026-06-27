import { useNavigate } from "react-router-dom";
import useUIStore from "../../store/useUIStore";
import useAuthStore from "../../store/useAuthStore";

// ---------- Профиль (нижний шит, мобайл) ----------
// Открывается из нижней навигации/хедера. Содержит профиль, переход в аналитику
// (для admin), ссылку на лендинг и выход.
export default function ProfileSheet() {
  const navigate = useNavigate();
  const { profileOpen, closeProfile } = useUIStore();
  const { user, role, logout } = useAuthStore();

  const go = (path) => {
    closeProfile();
    navigate(path);
  };

  // Переключение роли (демо). Партнёр → реальный вход в бэкенд, иначе фолбэк.
  const changeRole = async (next) => {
    if (next === "partner") {
      try {
        const res = await adminApi.login({ username: "partner@alfa.kz", password: "partner123" });
        setSession({ user: { name: res.user?.full_name || "Партнёр", email: "partner@alfa.kz" }, role: "partner", token: res.access_token, partnerId: res.user?.partner_id || null });
      } catch {
        // бэкенд недоступен — входим в демо-режим партнёра без мок-данных
        enterPartner({ partnerId: partnerId || null, name: "Клиника" });
      }
      go("/app/my-prices");
      return;
    }
    if (next === "admin") {
      try {
        const res = await adminApi.login({ username: "admin@medarchive.kz", password: "admin123" });
        setSession({ user: { name: res.user?.full_name || "Администратор", email: "admin@medarchive.kz" }, role: "admin", token: res.access_token, partnerId: null });
      } catch {
        setRole("admin");
      }
      go("/app/admin");
      return;
    }
    setRole(next);
    if (role === "partner" || role === "admin") go("/app/upload");
  };

  const handleLogout = () => {
    closeProfile();
    logout();
    navigate("/login");
  };

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" style={{ pointerEvents: profileOpen ? "auto" : "none" }} aria-hidden={!profileOpen}>
      {/* Затемнение */}
      <div
        onClick={closeProfile}
        className={`absolute inset-0 bg-black/55 transition-opacity duration-300 ${profileOpen ? "opacity-100" : "opacity-0"}`}
      />

      {/* Панель снизу */}
      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-[26px] border-t border-white/10 px-5 pt-3 transition-transform duration-300 bg-[rgba(16,16,24,0.96)] backdrop-blur-[24px] shadow-sheet"
        style={{
          transform: profileOpen ? "translateY(0)" : "translateY(110%)",
          paddingBottom: "calc(22px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Ручка-полоска */}
        <div className="w-10 h-[5px] rounded-full bg-white/15 mx-auto mb-4" />

        {/* Профиль */}
        <div className="flex items-center gap-[14px] mb-5">
          <div className="grid place-items-center w-[52px] h-[52px] rounded-[15px] font-display font-bold text-[19px] text-white shrink-0 bg-brand">
            {(user?.name || "Г").charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-semibold truncate">{user?.name || "Гость"}</div>
            <div className="text-[13px] text-ink/45 truncate">{user?.email || "—"}</div>
          </div>
        </div>

        {/* Действия */}
        <div className="flex flex-col gap-[2px]">
          {role === "admin" && (
            <SheetRow onClick={() => go("/app/admin")} label="Аналитика платформы" icon={<path d="M3 13h4l2-6 3 12 2.5-8 1.5 4h5" />} />
          )}
          {role === "partner" && (
            <>
              <SheetRow onClick={() => go("/app/my-prices")} label="Мой прайс" icon={<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 11h6M9 15h4" /></>} />
              <SheetRow onClick={() => go("/app/my-clinic")} label="Моя клиника" icon={<><path d="M4 21V8l8-4 8 4v13" /><path d="M9 21v-6h6v6" /></>} />
            </>
          )}
          <SheetRow onClick={() => go("/app/notifications")} label="Уведомления" icon={<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>} />
          <SheetRow onClick={() => go("/")} label="На сайт" icon={<><path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" /></>} />
          <SheetRow onClick={handleLogout} label="Выйти" danger icon={<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></>} />
        </div>
      </div>
    </div>
  );
}

// Строка действия внутри шита.
function SheetRow({ onClick, label, icon, danger }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-[13px] rounded-[13px] text-left transition-colors hover:bg-white/[0.05] ${danger ? "text-danger-soft" : "text-ink"}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      <span className="text-[14.5px] font-semibold">{label}</span>
    </button>
  );
}
