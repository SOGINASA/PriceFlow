import { Link } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import useUIStore from "../../store/useUIStore";
import { getMobileNav } from "./mobileNavItems";

// ---------- Нижняя навигация (мобайл) ----------
// Минималистичная «плавающая» панель в духе нативных приложений: активная
// вкладка — залитая иконка с акцентом и короткой подписью; профиль открывает
// нижний шит. Набор вкладок зависит от роли. Учитывает safe-area.
export default function MobileNav({ screen }) {
  const { user, role } = useAuthStore();
  const { openProfile, profileOpen, unreadCount } = useUIStore();
  const items = getMobileNav(role);

  // Общий рендер одной вкладки-ссылки.
  const Tab = ({ item }) => {
    const active = screen === item.key;
    const showBadge = item.key === "notifications" && unreadCount > 0 && !active;
    return (
      <Link to={item.to} className="relative flex-1 flex flex-col items-center justify-center gap-[5px] py-2 min-h-[48px]">
        {/* Индикатор активной вкладки сверху */}
        <span className={`absolute top-0 h-[3px] rounded-full bg-progress transition-all duration-300 ${active ? "w-5 opacity-100" : "w-0 opacity-0"}`} />
        <span className={`relative grid place-items-center transition-transform duration-200 ${active ? "scale-105" : "scale-100"}`}>
          <svg
            width="24" height="24" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            className={active ? "text-[#C7D0FF] drop-shadow-[0_4px_12px_rgba(94,92,230,0.5)]" : "text-ink/50"}
          >
            {active ? item.solid : item.outline}
          </svg>
          {/* Бейдж непрочитанных на колокольчике */}
          {showBadge && (
            <span className="absolute -top-[2px] -right-[3px] min-w-[15px] h-[15px] px-[3px] grid place-items-center rounded-full text-[9.5px] font-bold text-white bg-primary-400 shadow-[0_0_0_2px_#0B0B12]">
              {unreadCount}
            </span>
          )}
        </span>
        <span className={`text-[10px] font-semibold transition-colors ${active ? "text-[#C7D0FF]" : "text-ink/[0.42]"}`}>
          {item.label}
        </span>
      </Link>
    );
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch px-2 pt-[6px] border-t border-white/[0.08] bg-[rgba(11,11,17,0.82)] backdrop-blur-[24px]"
      style={{ paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      {items.map((item) => (
        <Tab key={item.key} item={item} />
      ))}

      {/* Профиль (открывает нижний шит) */}
      <button onClick={openProfile} className="relative flex-1 flex flex-col items-center justify-center gap-[5px] py-2 min-h-[48px]">
        <span className={`grid place-items-center w-[26px] h-[26px] rounded-full font-display font-bold text-[12px] text-white bg-brand transition-all duration-200 ${profileOpen ? "scale-105 ring-2 ring-primary-400/60 ring-offset-2 ring-offset-[#0B0B12]" : "scale-100"}`}>
          {(user?.name || "Г").charAt(0)}
        </span>
        <span className={`text-[10px] font-semibold transition-colors ${profileOpen ? "text-[#C7D0FF]" : "text-ink/[0.42]"}`}>
          Профиль
        </span>
      </button>
    </nav>
  );
}
