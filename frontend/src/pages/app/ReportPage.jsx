import { REPORT_ROWS, REPORT_CHART } from "../../data/mock";
import StatTile from "../../components/ui/StatTile";
import { useToast } from "../../components/ui/Toast";

// Ячейка цены в таблице сравнения. best — лучшая цена (зелёная, с точкой).
function PriceCell({ value, best }) {
  return (
    <td className="px-3 py-[11px] text-[13.5px]" style={{ fontWeight: best ? 700 : 500, color: best ? "#5BE892" : "rgba(245,245,247,.7)" }}>
      {best ? (
        <span className="inline-flex items-center gap-[6px]">
          <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#30D158", boxShadow: "0 0 6px #30D158" }} />
          {value} ₸
        </span>
      ) : (
        `${value} ₸`
      )}
    </td>
  );
}

export default function ReportPage() {
  const toast = useToast();
  const max = Math.max(...REPORT_CHART);
  const min = Math.min(...REPORT_CHART);

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* ---------- Шапка отчёта + экспорт ---------- */}
      <div className="flex flex-wrap gap-4 items-center justify-between px-6 py-[22px] rounded-[22px] border border-primary/25" style={{ background: "linear-gradient(135deg,rgba(94,92,230,.16),rgba(167,139,250,.07))" }}>
        <div className="flex items-center gap-4">
          <div className="grid place-items-center w-[52px] h-[52px] rounded-[15px] border" style={{ background: "rgba(48,209,88,.14)", borderColor: "rgba(48,209,88,.35)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
          </div>
          <div>
            <div className="font-display font-semibold text-xl">Единый отчёт · 12 клиник</div>
            <div className="text-[13px] text-ink/50 mt-[3px]">Обработано 4 218 позиций · 8 файлов · за 2.3 сек</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-[9px]">
          <button onClick={() => toast("Экспорт в XLSX начат")} className="inline-flex items-center gap-2 px-4 py-[11px] rounded-[11px] text-[13.5px] font-semibold border" style={{ background: "rgba(48,209,88,.12)", borderColor: "rgba(48,209,88,.3)", color: "#5BE892" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
            XLSX
          </button>
          {["CSV", "PDF"].map((fmt) => (
            <button key={fmt} onClick={() => toast(`Экспорт в ${fmt} начат`)} className="px-4 py-[11px] rounded-[11px] bg-white/5 border border-white/10 text-ink text-[13.5px] font-semibold transition-all hover:bg-white/[.09]">
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Плитки показателей ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatTile label="Позиций" value={4218} separator />
        <StatTile label="Клиник" value={12} />
        <StatTile label="Средняя экономия" value={34} suffix="%" accent="#5BE892" />
        <StatTile label="Время обработки" value={2.3} decimals={1} suffix=" с" />
      </div>

      {/* ---------- Таблица сравнения + график ---------- */}
      <div className="grid lg:grid-cols-[1.3fr_1fr] gap-4">
        {/* Сравнение цен */}
        <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[.06]">
            <div className="font-display font-semibold text-[15.5px]">Сравнение цен по услугам</div>
            <span className="text-xs text-ink/40">лучшая цена выделена</span>
          </div>
          <div className="p-[10px] overflow-x-auto">
            <table className="w-full border-collapse min-w-[460px]">
              <thead>
                <tr className="text-left">
                  {["Услуга", "Альфа", "Сити", "Здоровье+"].map((h) => (
                    <th key={h} className="px-3 py-[10px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {REPORT_ROWS.map((r, i) => (
                  <tr key={r.service} className="border-t border-white/[.05]" style={{ animation: `fadeUpItem .4s ${i * 55}ms cubic-bezier(.16,1,.3,1) both` }}>
                    <td className="px-3 py-[11px] text-[13.5px] font-semibold">{r.service}</td>
                    <PriceCell value={r.alpha} best={r.best === "alpha"} />
                    <PriceCell value={r.city} best={r.best === "city"} />
                    <PriceCell value={r.health} best={r.best === "health"} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* График разброса цен */}
        <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] p-5 flex flex-col">
          <div className="font-display font-semibold text-[15.5px]">Разброс цен · МРТ</div>
          <div className="text-[12.5px] text-ink/45 mt-[3px] mb-auto">по 12 клиникам, тыс. ₸</div>
          <div className="flex items-end gap-2 h-[170px] mt-[18px]">
            {REPORT_CHART.map((v, i) => {
              const isMin = v === min;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-t-[5px]"
                    style={{
                      height: `${(v / max) * 100}%`,
                      background: isMin ? "linear-gradient(180deg,#5BE892,#1F8A5B)" : "linear-gradient(180deg,rgba(110,139,255,.85),rgba(94,92,230,.3))",
                      boxShadow: isMin ? "0 0 16px rgba(48,209,88,.4)" : "none",
                      transition: `height .8s cubic-bezier(.16,1,.3,1) ${i * 45}ms`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-[14px] pt-[14px] border-t border-white/[.06]">
            <div><div className="text-[11.5px] text-ink/45">Минимум</div><div className="text-[15px] font-bold" style={{ color: "#5BE892" }}>14.9к ₸</div></div>
            <div className="text-center"><div className="text-[11.5px] text-ink/45">Медиана</div><div className="text-[15px] font-bold">19.4к ₸</div></div>
            <div className="text-right"><div className="text-[11.5px] text-ink/45">Максимум</div><div className="text-[15px] font-bold" style={{ color: "#FF8B85" }}>28.5к ₸</div></div>
          </div>
        </div>
      </div>
    </section>
  );
}
