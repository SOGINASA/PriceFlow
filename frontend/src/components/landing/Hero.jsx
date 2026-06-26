import { useState } from "react";
import { Link } from "react-router-dom";
import Aurora from "../ui/Aurora";
import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";
import { formatNumber } from "../../lib/format";

const fmtPrice = (v) => (v == null ? "—" : `${formatNumber(v)} ₸`);

// Hero получает первый реальный отчёт (report) — карточка-превью строится из него.
export default function Hero({ report }) {
  const { t } = useI18n();
  const tr = t();
  const [role, setRole] = useState("user");

  // Данные карточки из реального отчёта (или нейтральная заглушка до загрузки).
  const hasData = !!(report && report.summary);
  const cardTitle = hasData ? report.title : tr.card.title;
  const cardSub = hasData ? `${formatNumber(report.summary.items)} ${tr.card.unit}` : tr.card.sub;
  const chartTitle = report?.chart_service ? `${tr.card.chartTitle} · ${report.chart_service}` : tr.card.chartTitle;
  const bars = report?.chart?.length ? report.chart : [];
  const barMax = bars.length ? Math.max(...bars) : 1;
  const barMin = bars.length ? Math.min(...bars) : 0;
  const firstRow = report?.rows?.[0];
  const columns = report?.columns || [];
  const listItems = firstRow
    ? columns
        .filter((c) => firstRow.prices[c.key] != null)
        .slice(0, 3)
        .map((c) => ({ name: c.label, price: firstRow.prices[c.key], best: c.key === firstRow.best }))
    : [];
  const [eyebrowRef, eyebrowVis] = useReveal();
  const [titleRef, titleVis] = useReveal();
  const [subRef, subVis] = useReveal();
  const [ctaRef, ctaVis] = useReveal();
  const [cardRef, cardVis] = useReveal();

  return (
    <section id="top" className="relative min-h-screen flex flex-col items-center px-6 pt-[150px] pb-20">
      <Aurora variant="hero" />

      {/* ---------- Текстовый блок ---------- */}
      <div className="relative z-[2] w-full min-w-0 flex flex-col items-center text-center max-w-[920px]">
        {/* Eyebrow с пульсирующей точкой («таблетка» с подсветкой) */}
        <div ref={eyebrowRef} style={revealStyle(eyebrowVis)}>
          <span className="inline-flex items-center gap-2 px-[15px] py-[7px] rounded-full border text-[13px] font-semibold bg-primary/[0.12] border-primary/30 text-[#B9B6FF]">
            <span className="w-[7px] h-[7px] rounded-full animate-pulse-dot bg-primary-400 shadow-[0_0_10px_#6E8BFF]" />
            {tr.hero.eyebrow}
          </span>
        </div>

        {/* Заголовок с градиентным акцентным словом */}
        <h1
          ref={titleRef}
          style={revealStyle(titleVis, 90)}
          className="font-display font-bold mt-[26px] whitespace-pre-line max-w-full break-words text-[clamp(28px,7vw,88px)] leading-[1.06] tracking-[-.03em]"
        >
          {tr.hero.titlePre}
          <span className="text-gradient">{tr.hero.titleAccent}</span>
          {tr.hero.titlePost}
        </h1>

        {/* Подзаголовок */}
        <p
          ref={subRef}
          style={revealStyle(subVis, 170)}
          className="mt-[26px] max-w-[620px] leading-[1.6] text-ink/60 text-[clamp(16px,2vw,19px)]"
        >
          {tr.hero.sub}
        </p>

        {/* Кнопки действия */}
        <div ref={ctaRef} style={revealStyle(ctaVis, 250)} className="flex flex-wrap gap-[14px] justify-center mt-[38px]">
          <Link
            to="/login"
            className="inline-flex items-center gap-[10px] text-base font-semibold px-7 py-[15px] rounded-[14px] text-white transition-transform hover:-translate-y-[2px] bg-brand shadow-[0_10px_40px_rgba(94,92,230,0.45)]"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 12V3M9 3 5.5 6.5M9 3l3.5 3.5M3 13.5h12" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {tr.hero.cta1}
          </Link>
          <a
            href="#how"
            className="inline-flex items-center gap-[10px] text-base font-semibold px-[26px] py-[15px] rounded-[14px] text-ink border border-white/10 transition-transform hover:-translate-y-[2px] bg-white/[0.06]"
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
        <div className="rounded-[22px] overflow-hidden border border-white/10 bg-[rgba(20,20,27,0.85)] shadow-card-hero backdrop-blur-[10px]">
          {/* Шапка окна браузера */}
          <div className="flex items-center gap-[14px] px-[18px] py-[14px] border-b border-white/[0.07]">
            <div className="flex gap-[7px]">
              <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
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
                    className={`font-semibold text-[11px] px-[9px] py-1 rounded-[7px] transition-all ${on ? "bg-primary/90 text-white" : "bg-transparent text-ink/50"}`}
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
              <div className="min-w-0">
                <div className="font-display font-semibold text-[17px] truncate">{cardTitle}</div>
                <div className="text-[12.5px] text-ink/45 mt-[3px]">{cardSub}</div>
              </div>
              {hasData && (
                <div className="inline-flex items-center gap-[7px] px-[13px] py-[7px] rounded-[10px] text-[12.5px] font-semibold border bg-success/[0.12] border-success/30 text-success-soft shrink-0">
                  <span className="w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_#30D158]" />
                  {tr.card.badge}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-[14px]">
              {/* Мини-график разброса цен */}
              <div className="border border-white/[0.07] rounded-[14px] p-4 bg-white/[0.02]">
                <div className="text-xs text-ink/45 mb-[14px] truncate">{chartTitle}</div>
                <div className="flex items-end gap-[9px] h-24">
                  {bars.length ? (
                    bars.map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col justify-end">
                        <div
                          className={`rounded-t-[6px] ${v === barMin ? "bg-bar-peak shadow-[0_0_18px_rgba(94,92,230,.5)]" : "bg-[linear-gradient(180deg,rgba(110,139,255,.7),rgba(110,139,255,.2))]"}`}
                          style={{ height: `${barMax ? (v / barMax) * 100 : 0}%` }}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[12px] text-ink/30">{tr.card.empty}</div>
                  )}
                </div>
              </div>

              {/* Список лучших цен по услуге */}
              <div className="border border-white/[0.07] rounded-[14px] p-4 flex flex-col gap-[11px] bg-white/[0.02]">
                <div className="text-xs text-ink/45 truncate">{firstRow ? firstRow.service : tr.card.listTitle}</div>
                {listItems.length ? (
                  listItems.map((it, i) => (
                    <div key={i}>
                      {i > 0 && <div className="h-px bg-white/[0.06] mb-[11px]" />}
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[13px] truncate ${it.best ? "text-ink/80" : "text-ink/55"}`}>{it.name}</span>
                        <span className={`text-[13px] font-bold shrink-0 ${it.best ? "text-success-soft" : "text-ink/75"}`}>{fmtPrice(it.price)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex-1 grid place-items-center text-[12px] text-ink/30">{tr.card.empty}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
