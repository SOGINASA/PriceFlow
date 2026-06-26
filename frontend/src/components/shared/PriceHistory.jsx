import { formatNumber, formatDate } from "../../lib/format";

// ---------- Таймлайн истории цен ----------
// Показывает все версии цены позиции по датам (текущая + архивные).
// Виден всем пользователям — требование: «когда какая цена была и изменения
// по ней». item: { resident, nonResident, effectiveDate, history:[{resident,nonResident,date}] }.
//
// Собираем единый список (новые → старые), считаем изменение цены резидента
// относительно предыдущей версии и подсвечиваем рост/снижение.
export function buildTimeline(item) {
  const entries = [
    ...(item.history || []).map((h) => ({ ...h, current: false })),
    { resident: item.resident, nonResident: item.nonResident, date: item.effectiveDate, current: true },
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return entries.map((e, i) => {
    const older = entries[i + 1];
    let delta = null;
    if (older && older.resident) {
      delta = Math.round(((e.resident - older.resident) / older.resident) * 100);
    }
    return { ...e, delta };
  });
}

export default function PriceHistory({ item, compact = false }) {
  const timeline = buildTimeline(item);

  if (timeline.length <= 1) {
    return <div className="text-[12.5px] text-ink/40">Цена не менялась · действует с {formatDate(item.effectiveDate)}</div>;
  }

  return (
    <div className="flex flex-col">
      {timeline.map((e, i) => (
        <div key={i} className="flex items-center gap-3 py-[7px]">
          {/* Маркер таймлайна */}
          <div className="flex flex-col items-center self-stretch">
            <span className={`w-[9px] h-[9px] rounded-full shrink-0 ${e.current ? "bg-success shadow-[0_0_6px_#30D158]" : "bg-white/25"}`} />
            {i < timeline.length - 1 && <span className="w-px flex-1 bg-white/10 mt-[2px]" />}
          </div>

          <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
            <div>
              <div className="text-[13px] font-semibold flex items-center gap-2">
                с {formatDate(e.date)}
                {e.current && (
                  <span className="text-[10px] font-bold px-[6px] py-[1px] rounded-full bg-success/[0.14] text-success-soft border border-success/30">
                    текущая
                  </span>
                )}
              </div>
              {!compact && (
                <div className="text-[11.5px] text-ink/45 mt-[1px]">
                  нерезидент: {formatNumber(e.nonResident)} ₸
                </div>
              )}
            </div>

            <div className="text-right shrink-0">
              <div className="text-[14px] font-bold tabular-nums">{formatNumber(e.resident)} ₸</div>
              {e.delta != null && e.delta !== 0 && (
                <div className={`text-[11px] font-semibold ${e.delta > 0 ? "text-danger-soft" : "text-success-soft"}`}>
                  {e.delta > 0 ? "↑ +" : "↓ "}{e.delta}%
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
