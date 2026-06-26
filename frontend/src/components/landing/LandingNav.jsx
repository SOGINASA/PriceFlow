import { Link } from "react-router-dom";
import Logo from "../ui/Logo";
import useI18n, { LANGUAGES } from "../../i18n/useI18n";

// ---------- Навигация лендинга ----------
// Плавающая «стеклянная» панель сверху: логотип, якорные ссылки,
// переключатель языка (RU/KZ/EN) и кнопка входа в приложение.
export default function LandingNav() {
  const { lang, setLang, t } = useI18n();
  const tr = t();

  const links = [
    { href: "#how", label: tr.nav.how },
    { href: "#features", label: tr.nav.features },
    { href: "#search", label: tr.nav.search },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center px-6 py-4">
      <div
        className="flex items-center justify-between w-full max-w-[1200px] py-[10px] pr-[14px] pl-5 rounded-[18px] border border-white/10"
        style={{ background: "rgba(18,18,24,.6)", backdropFilter: "blur(20px)" }}
      >
        {/* Логотип → к началу страницы */}
        <a href="#top">
          <Logo />
        </a>

        {/* Якорные ссылки (скрыты на мобильных) */}
        <div className="hidden md:flex items-center gap-[30px]">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink/60 transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
          <Link to="/login" className="text-sm font-medium text-ink/60 transition-colors hover:text-ink">
            {tr.nav.signin}
          </Link>
        </div>

        {/* Переключатель языка + CTA */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-[2px] p-[3px] rounded-[11px] bg-white/5 border border-white/[.07]">
            {LANGUAGES.map((code) => {
              const on = lang === code;
              return (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className="font-semibold text-xs px-[9px] py-[5px] rounded-lg transition-all"
                  style={{
                    background: on ? "rgba(94,92,230,.9)" : "transparent",
                    color: on ? "#fff" : "rgba(245,245,247,.55)",
                  }}
                >
                  {code.toUpperCase()}
                </button>
              );
            })}
          </div>
          <Link
            to="/login"
            className="text-sm font-semibold px-[18px] py-[10px] rounded-[11px] bg-ink text-bg transition-transform hover:-translate-y-[1px]"
          >
            {tr.nav.start}
          </Link>
        </div>
      </div>
    </nav>
  );
}
