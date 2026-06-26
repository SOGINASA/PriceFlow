import { useState } from "react";
import { Link } from "react-router-dom";
import Aurora from "../ui/Aurora";
import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// Высоты столбиков мини-графика «разброс цен» в карточке.
const CHART_BARS = [42, 68, 54, 100, 76, 60];

export default function Hero() {
  const { t } = useI18n();
  const tr = t();
  const [role, setRole] = useState("user");
  const [eyebrowRef, eyebrowVis] = useReveal();
  const [titleRef, titleVis] = useReveal();
  const [subRef, subVis] = useReveal();
  const [ctaRef, ctaVis] = useReveal();
  const [cardRef, cardVis] = useReveal();

  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center px-6 pt-[150px] pb-20">
      <Aurora variant="hero" />

      {/* ---------- Текстовый блок ---------- */}
      <div className="relative z-[2] flex flex-col items-center text-center max-w-[920px]">
        {/* Eyebrow с пульсирующей точкой («таблетка» с подсветкой) */}
        <div ref={eyebrowRef} style={revealStyle(eyebrowVis)}>
          <span className="inline-flex items-center gap-2 px-[15px] py-[7px] rounded-full border text-[13px] font-semibold" style={{ background: "rgba(94,92,230,.12)", borderColor: "rgba(94,92,230,.3)", color: "#B9B6FF" }}>
            <span className="w-[7px] h-[7px] rounded-full animate-pulse-dot" style={{ background: "#6E8BFF", boxShadow: "0 0 10px #6E8BFF" }} />
            {tr.hero.eyebrow}
          </span>
        </div>

        {/* Заголовок с градиентным акцентным словом */}
        <h1
          ref={titleRef}
          style={{ ...revealStyle(titleVis, 90), fontSize: "clamp(42px,7.2vw,88px)", lineHeight: 1.02, letterSpacing: "-.035em" }}
          className="font-display font-bold mt-[26px] whitespace-pre-line"
        >
          {tr.hero.titlePre}
          <span className="text-gradient">{tr.hero.titleAccent}</span>
          {tr.hero.titlePost}
        </h1>

        {/* Подзаголовок */}
        <p
          ref={subRef}
          style={{ ...revealStyle(subVis, 170), fontSize: "clamp(16px,2vw,19px)" }}
          className="mt-[26px] max-w-[620px] leading-[1.6] text-ink/60"
        >
          {tr.hero.sub}
        </p>

        {/* Кнопки действия */}
        <div ref={ctaRef} style={revealStyle(ctaVis, 250)} className="flex flex-wrap gap-[14px] justify-center mt-[38px]">
          <Link
            to="/login"
            className="inline-flex items-center gap-[10px] text-base font-semibold px-7 py-[15px] rounded-[14px] text-white transition-transform hover:-translate-y-[2px]"
            style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", boxShadow: "0 10px 40px rgba(94,92,230,.45)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 12V3M9 3 5.5 6.5M9 3l3.5 3.5M3 13.5h12" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tr.hero.cta1}
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-[10px] text-base font-semibold px-[26px] py-[15px] rounded-[14px] text-ink border border-white/10 transition-transform hover:-translate-y-[2px]"
            style={{ background: "rgba(255,255,255,.06)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="#F5F5F7" />
            </svg>
            {tr.hero.cta2}
          </a>
        </div>
      </div>

      {/* ---------- Плавающая карточка продукта ---------- */}
      <div ref={cardRef} style={revealStyle(cardVis, 330)} className="relative z-[2] mt-16 w-full max-w-[880px]">
        <div
          className="rounded-[22px] overflow-hidden border border-white/10"
          style={{ background: "rgba(20,20,27,.85)", boxShadow: "0 40px 120px rgba(0,0,0,.6),0 0 80px rgba(94,92,230,.15)", backdropFilter: "blur(10px)" }}
        >
          {/* Шапка окна браузера */}
          <div className="flex items-center gap-[14px] px-[18px] py-[14px] border-b border-white/[.07]">
            <div className="flex gap-[7px]">
              <span className="w-[11px] h-[11px] rounded-full" style={{ background: "#FF5F57" }} />
              <span className="w-[11px] h-[11px] rounded-full" style={{ background: "#FEBC2E" }} />
              <span className="w-[11px] h-[11px] rounded-full" style={{ background: "#28C840" }} />
            </div>
            <div className="flex-1 text-center text-[12.5px] text-ink/40">app.medpartners.io / отчёт</div>
            {/* Переключатель ролей внутри карточки */}
            <div className="flex gap-[3px] p-[3px] rounded-[9px] bg-white/5">
              {[["user", tr.card.roleUser], ["admin", tr.card.roleAdmin]].map(([key, label]) => {
                const on = role === key;
                return (
                  <button
                    key={key}
                    onClick={() => setRole(key)}
                    className="font-semibold text-[11px] px-[9px] py-1 rounded-[7px] transition-all"
                    style={{ background: on ? "rgba(94,92,230,.9)" : "transparent", color: on ? "#fff" : "rgba(245,245,247,.5)" }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Тело карточки */}
          <div className="p-[22px]">
            <div className="flex items-center justify-between mb-[18px]">
              <div>
                <div className="font-display font-semibold text-[17px]">{tr.card.title}</div>
                <div className="text-[12.5px] text-ink/45 mt-[3px]">{tr.card.sub}</div>
              </div>
              <div className="inline-flex items-center gap-[7px] px-[13px] py-[7px] rounded-[10px] text-[12.5px] font-semibold border" style={{ background: "rgba(48,209,88,.12)", borderColor: "rgba(48,209,88,.3)", color: "#5BE892" }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#30D158", boxShadow: "0 0 8px #30D158" }} />
                {tr.card.badge}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[14px]">
              {/* Мини-график */}
              <div className="border border-white/[.07] rounded-[14px] p-4" style={{ background: "rgba(255,255,255,.02)" }}>
                <div className="text-xs text-ink/45 mb-[14px]">{tr.card.chartTitle}</div>
                <div className="flex items-end gap-[9px] h-24">
                  {CHART_BARS.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end">
                      <div
                        className="rounded-t-[6px]"
                        style={{
                          height: `${h}%`,
                          background: h === 100 ? "linear-gradient(180deg,#A78BFA,#5E5CE6)" : "linear-gradient(180deg,rgba(110,139,255,.7),rgba(110,139,255,.2))",
                          boxShadow: h === 100 ? "0 0 18px rgba(94,92,230,.5)" : "none",
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Список лучших цен */}
              <div className="border border-white/[.07] rounded-[14px] p-4 flex flex-col gap-[11px]" style={{ background: "rgba(255,255,255,.02)" }}>
                <div className="text-xs text-ink/45">{tr.card.listTitle}</div>
                {[
                  ["Клиника «Альфа»", "14 900 ₸", true],
                  ["Медцентр «Сити»", "18 200 ₸", false],
                  ["«Здоровье+»", "21 500 ₸", false],
                ].map(([name, price, best], i) => (
                  <div key={i}>
                    {i > 0 && <div className="h-px bg-white/[.06] mb-[11px]" />}
                    <div className="flex items-center justify-between">
                      <span className="text-[13px]" style={{ color: best ? "rgba(245,245,247,.8)" : "rgba(245,245,247,.55)" }}>{name}</span>
                      <span className="text-[13px] font-bold" style={{ color: best ? "#5BE892" : "rgba(245,245,247,.75)" }}>{price}</span>
                    </div>
                  </div>
                ))}
                <span className="mt-auto inline-flex items-center gap-[7px] text-[12.5px] font-semibold" style={{ color: "#B9B6FF" }}>
                  {tr.card.export} →
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
