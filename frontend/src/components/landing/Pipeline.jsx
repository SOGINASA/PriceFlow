import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";
import { formatNumber } from "../../lib/format";

const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s || "");

// ---------- Секция «Один пайплайн» ----------
// Визуализация потока: входные файлы → AI-ядро → готовый отчёт. Выходной отчёт
// заполняется реальными строками из первого отчёта (report), если он есть.
export default function Pipeline({ report }) {
  const { t } = useI18n();
  const tr = t();
  const [headRef, headVis] = useReveal();
  const [diagRef, diagVis] = useReveal();

  // Реальные строки выходного отчёта (топ-3 услуги по покрытию).
  const ys = [135, 177, 219];
  const outRows = (report?.rows || []).slice(0, 3).map((r, i) => ({
    y: ys[i],
    name: truncate(r.service, 18),
    price: r.prices[r.best] != null ? `${formatNumber(r.prices[r.best])} ₸` : "—",
    best: i === 0,
  }));

  const paths = [
    "M250,118 C 380,118 440,205 520,222",
    "M250,235 C 380,235 450,235 520,235",
    "M250,352 C 380,352 440,265 520,248",
    "M680,235 C 800,235 840,150 940,150",
    "M680,235 C 800,235 840,320 940,320",
  ];

  return (
    <section id="how" className="relative px-6 pt-[90px] pb-[70px] max-w-[1240px] mx-auto">
      {/* Заголовок секции */}
      <div ref={headRef} style={revealStyle(headVis)} className="text-center max-w-[680px] mx-auto mb-[50px]">
        <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#8B88FF]">{tr.pipe.eyebrow}</div>
        <h2 className="font-display font-bold mt-[14px] whitespace-pre-line text-[clamp(30px,4.5vw,46px)] tracking-[-.03em] leading-[1.08]">{tr.pipe.title}</h2>
        <p className="mt-[18px] text-[17px] leading-[1.6] text-ink/60">{tr.pipe.sub}</p>
      </div>

      {/* Диаграмма потока */}
      <div ref={diagRef} style={revealStyle(diagVis)} className="relative rounded-[26px] border border-white/10 overflow-hidden p-2">
        {/* фон-градиент панели */}
        <div className="absolute inset-0 rounded-[26px] bg-panel" />
        <div className="relative">
          <svg viewBox="0 0 1200 470" className="w-full h-auto block">
            <defs>
              <linearGradient id="gAcc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#6E8BFF" />
                <stop offset="1" stopColor="#A78BFA" />
              </linearGradient>
              <radialGradient id="gCore" cx="50%" cy="42%" r="62%">
                <stop offset="0" stopColor="#C9D0FF" />
                <stop offset="52%" stopColor="#5E5CE6" />
                <stop offset="100%" stopColor="#2C2470" />
              </radialGradient>
              <filter id="fGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Соединительные линии */}
            {paths.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="url(#gAcc)" strokeWidth="1.6" opacity=".25" />
            ))}
            {/* Летящие точки */}
            {paths.map((d, i) => (
              <circle key={`dot${i}`} r="4.5" fill="#fff" filter="url(#fGlow)">
                <animateMotion dur={`${2 + (i % 3) * 0.2}s`} begin={`${i * 0.3}s`} repeatCount="indefinite" path={d} />
              </circle>
            ))}

            {/* Входные файлы */}
            {[
              { y: 80, color: "#FF8B85", bg: "rgba(255,95,87,.18)", label: "PDF" },
              { y: 197, color: "#5BE892", bg: "rgba(48,209,88,.16)", label: "XLS" },
              { y: 314, color: "#9DB0FF", bg: "rgba(110,139,255,.18)", label: "СКАН" },
            ].map((f, i) => (
              <g key={i}>
                <animateTransform attributeName="transform" type="translate" values="0 0;0 -7;0 0" dur="4.5s" begin={`${i * 1.5}s`} repeatCount="indefinite" />
                <rect x="80" y={f.y} width="170" height="76" rx="14" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.12)" />
                <rect x="98" y={f.y + 20} width="34" height="38" rx="6" fill={f.bg} stroke={f.color} />
                <text x="115" y={f.y + 44} fontFamily="Sora" fontSize="10" fontWeight="700" fill={f.color} textAnchor="middle">{f.label}</text>
                <rect x="146" y={f.y + 22} width="86" height="8" rx="4" fill="rgba(255,255,255,.22)" />
                <rect x="146" y={f.y + 40} width="64" height="8" rx="4" fill="rgba(255,255,255,.12)" />
                <rect x="146" y={f.y + 58} width="74" height="8" rx="4" fill="rgba(255,255,255,.12)" />
              </g>
            ))}

            {/* AI-ядро */}
            <circle cx="600" cy="235" r="60" fill="none" stroke="#7E7BFF" strokeWidth="2" strokeDasharray="6 12" opacity=".7">
              <animateTransform attributeName="transform" type="rotate" from="0 600 235" to="360 600 235" dur="9s" repeatCount="indefinite" />
            </circle>
            <circle cx="600" cy="235" r="46" fill="url(#gCore)" />
            <text x="600" y="229" fontFamily="Sora" fontSize="20" fontWeight="700" fill="#fff" textAnchor="middle">AI</text>
            <text x="600" y="248" fontFamily="Manrope" fontSize="9" fontWeight="600" fill="rgba(255,255,255,.75)" textAnchor="middle" letterSpacing="1">MEDPARTNERS</text>

            {/* Выходной отчёт (реальные строки, если есть данные) */}
            <rect x="940" y="75" width="250" height="320" rx="18" fill="rgba(255,255,255,.04)" stroke="rgba(255,255,255,.12)" />
            {outRows.map((r, i) => (
              <g key={i} fontFamily="Manrope" fontSize="11" fontWeight="600">
                <rect x="962" y={r.y} width="206" height="34" rx="9" fill={r.best ? "rgba(110,139,255,.1)" : "rgba(255,255,255,.03)"} />
                <text x="974" y={r.y + 21} fill={r.best ? "rgba(245,245,247,.85)" : "rgba(245,245,247,.6)"}>{r.name}</text>
                <text x="1156" y={r.y + 21} fill={r.best ? "#5BE892" : "rgba(245,245,247,.75)"} textAnchor="end">{r.price}</text>
              </g>
            ))}
            {outRows.length === 0 && (
              <text x="1065" y="240" fontFamily="Manrope" fontSize="11" fontWeight="600" fill="rgba(245,245,247,.35)" textAnchor="middle">{tr.card.empty}</text>
            )}
          </svg>

          {/* Шаги пайплайна */}
          <div className="flex flex-wrap gap-[10px] justify-center px-[18px] pt-2 pb-[22px]">
            {tr.pipe.steps.map((step, i) => {
              const on = i === 0;
              return (
                <div key={i} className={`flex items-center gap-[9px] px-[15px] py-[9px] rounded-[11px] border ${on ? "bg-primary/[0.14] border-primary/35" : "bg-white/[0.04] border-white/[0.08]"}`}>
                  <span className={`w-2 h-2 rounded-full ${on ? "bg-primary-400 shadow-[0_0_8px_#6E8BFF]" : "bg-ink/30"}`} />
                  <span className={`text-[13.5px] font-semibold ${on ? "text-ink" : "text-ink/70"}`}>{step}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
