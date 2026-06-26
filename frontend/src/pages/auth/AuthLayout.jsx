import { Link } from "react-router-dom";
import Aurora from "../../components/ui/Aurora";

// ---------- Обёртка экранов авторизации ----------
// Фон-аврора, ссылка «На главную» и центрирование карточки.
export default function AuthLayout({ children }) {
  return (
    <div className="relative w-full min-h-screen bg-bg overflow-hidden">
      <Aurora variant="app" />

      <div className="relative z-[2] min-h-screen flex items-center justify-center px-6 pt-20 pb-14">
        {/* Назад на лендинг */}
        <Link
          to="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 pl-3 pr-[15px] py-[9px] rounded-[11px] bg-white/5 border border-white/10 text-ink/70 text-[13.5px] font-semibold transition-all hover:bg-white/10 hover:text-ink hover:-translate-x-[2px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          На главную
        </Link>

        {children}
      </div>
    </div>
  );
}

// Шапка карточки авторизации (логотип + заголовок) — общая для Login/Register.
export function AuthHeader({ title, subtitle }) {
  return (
    <div className="flex flex-col items-center text-center mb-[30px]">
      <span className="grid place-items-center w-[54px] h-[54px] rounded-2xl mb-[18px]" style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", boxShadow: "0 0 30px rgba(94,92,230,.55)" }}>
        <svg width="27" height="27" viewBox="0 0 16 16" fill="none">
          <path d="M2 11.5 6 6l3 3 5-6.5" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h1 className="font-display font-bold text-[30px] tracking-[-.025em]">{title}</h1>
      <p className="mt-2 text-[15px] text-ink/50">{subtitle}</p>
    </div>
  );
}
