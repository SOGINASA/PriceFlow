import { Link } from "react-router-dom";
import useAuthStore from "../../store/useAuthStore";
import { NAV_ITEMS, canSee } from "./navItems";

// ---------- Нижняя навигация (мобильные) ----------
export default function MobileNav({ screen }) {
  const role = useAuthStore((s) => s.role);

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch justify-around gap-[2px] px-2 pt-2 border-t border-white/[.08]"
      style={{ background: "rgba(14,14,20,.86)", backdropFilter: "blur(22px)", paddingBottom: "calc(8px + env(safe-area-inset-bottom))" }}
    >
      {NAV_ITEMS.filter((item) => canSee(item, role)).map((item) => {
        const active = screen === item.key;
        return (
          <Link
            key={item.key}
            to={item.to}
            className="flex-1 flex flex-col items-center gap-1 py-[7px] px-1 rounded-xl transition-colors"
            style={{ color: active ? "#9DB0FF" : "rgba(245,245,247,.5)", background: active ? "rgba(94,92,230,.12)" : "transparent" }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              {item.icon}
            </svg>
            <span className="text-[10.5px] font-semibold">{item.shortLabel || item.label}</span>
          </Link>
        );
      })}
      {/* Ссылка на лендинг */}
      <Link to="/" className="flex-1 flex flex-col items-center gap-1 py-[7px] px-1 text-ink/50 rounded-xl">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 11l9-8 9 8" /><path d="M5 10v10h14V10" />
        </svg>
        <span className="text-[10.5px] font-semibold">Сайт</span>
      </Link>
    </nav>
  );
}
