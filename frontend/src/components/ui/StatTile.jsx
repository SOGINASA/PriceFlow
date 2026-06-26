import { useCountUp } from "../../hooks/useCountUp";

// ---------- Плитка показателя с анимированным счётчиком ----------
// label — подпись, value — целевое число, suffix — единица (%, с, …),
// trend — опциональный бейдж изменения (+12%), accent — цвет значения.
export default function StatTile({ label, value, decimals = 0, separator = false, suffix = "", trend, accent }) {
  const [ref, shown] = useCountUp(value, { decimals, separator });
  return (
    <div className="p-5 rounded-[18px] bg-white/[.03] border border-white/[.07]">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink/45">{label}</span>
        {trend && <span className="text-[11px] font-semibold text-success-soft">{trend}</span>}
      </div>
      <div ref={ref} className="font-display font-bold text-[30px] mt-[6px] tracking-[-.02em]" style={accent ? { color: accent } : undefined}>
        {shown}
        {suffix}
      </div>
    </div>
  );
}
