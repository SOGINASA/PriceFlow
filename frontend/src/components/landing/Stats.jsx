import useI18n from "../../i18n/useI18n";
import { useCountUp } from "../../hooks/useCountUp";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// Показатели платформы из реальных данных (GET /dashboard/stats).
// Порядок и подписи совпадают с translations.stats.
function buildConfig(stats) {
  return [
    { value: stats?.partners ?? 0, separator: true },
    { value: stats?.services ?? 0, separator: true },
    { value: stats?.documents?.total ?? 0, separator: true },
    { value: stats?.items?.normalization_rate_pct ?? 0, decimals: 1, suffix: "%" },
  ];
}

function StatCard({ config, label, delay, start }) {
  const [ref, value] = useCountUp(config.value, {
    decimals: config.decimals || 0,
    separator: config.separator,
    start,
  });
  const [revRef, vis] = useReveal();
  return (
    <div ref={revRef} style={revealStyle(vis, delay)} className="text-center px-4 py-[30px] rounded-[20px] bg-white/[.03] border border-white/[.07]">
      <div ref={ref} className="font-display font-bold text-[clamp(34px,4.5vw,52px)] tracking-[-.03em] bg-stat-text bg-clip-text text-transparent">
        {value}
        {config.suffix || ""}
      </div>
      <div className="mt-2 text-sm text-ink/55">{label}</div>
    </div>
  );
}

export default function Stats({ stats }) {
  const { t } = useI18n();
  const tr = t();
  const config = buildConfig(stats);
  return (
    <section className="px-6 pt-[60px] pb-[70px] max-w-[1200px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {config.map((c, i) => (
          <StatCard key={i} config={c} label={tr.stats[i]} delay={i * 80} start={!!stats} />
        ))}
      </div>
    </section>
  );
}
