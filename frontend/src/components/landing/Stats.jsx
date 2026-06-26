import useI18n from "../../i18n/useI18n";
import { useCountUp } from "../../hooks/useCountUp";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// Конфигурация четырёх показателей (значение + формат вывода).
const STAT_CONFIG = [
  { value: 30, suffix: "+" },
  { value: 60, suffix: "×" },
  { value: 99.4, decimals: 1, suffix: "%" },
  { value: 1240, separator: true },
];

function StatCard({ config, label, delay }) {
  const [ref, value] = useCountUp(config.value, { decimals: config.decimals || 0, separator: config.separator });
  const [revRef, vis] = useReveal();
  return (
    <div ref={revRef} style={revealStyle(vis, delay)} className="text-center px-4 py-[30px] rounded-[20px] bg-white/[.03] border border-white/[.07]">
      <div ref={ref} className="font-display font-bold" style={{ fontSize: "clamp(34px,4.5vw,52px)", letterSpacing: "-.03em", background: "linear-gradient(120deg,#fff,#9DB0FF)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
        {value}
        {config.suffix || ""}
      </div>
      <div className="mt-2 text-sm text-ink/55">{label}</div>
    </div>
  );
}

export default function Stats() {
  const { t } = useI18n();
  const tr = t();
  return (
    <section className="px-6 pt-[60px] pb-[70px] max-w-[1200px] mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {STAT_CONFIG.map((config, i) => (
          <StatCard key={i} config={config} label={tr.stats[i]} delay={i * 80} />
        ))}
      </div>
    </section>
  );
}
