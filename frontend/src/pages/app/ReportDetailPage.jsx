import { useParams, Link } from "react-router-dom";
import { REPORTS } from "../../data/mock";
import StatTile from "../../components/ui/StatTile";
import { useToast } from "../../components/ui/Toast";

// Колонки сравнения (ключ в строке данных + подпись).
const COLUMNS = [
  { key: "alpha", label: "Альфа" },
  { key: "city", label: "Сити" },
  { key: "health", label: "Здоровье+" },
];

export default function ReportDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const report = REPORTS.find((r) => r.id === id) || REPORTS[0];

  const max = Math.max(...report.chart);
  const min = Math.min(...report.chart);

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* Назад к списку */}
      <Link to="/app/report" className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-ink/60 transition-colors hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Все отчёты
      </Link>

      {/* ---------- Шапка отчёта + экспорт ---------- */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-5 sm:px-6 py-[22px] rounded-[22px] border border-primary/25 bg-brand-soft">
        <div className="flex items-center gap-4">
          <div className="grid place-items-center w-[52px] h-[52px] rounded-[15px] bg-success/[0.14] border border-success/35 shrink-0">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
          </div>
          <div>
            <div className="font-display font-semibold text-xl">{report.title}</div>
            <div className="text-[13px] text-ink/50 mt-[3px]">
              {report.items.toLocaleString("ru-RU").replace(/,/g, " ")} позиций · {report.files} файлов · за {report.duration}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-[9px]">
          <button onClick={() => toast("Экспорт в XLSX начат")} className="inline-flex items-center gap-2 px-4 py-[11px] rounded-[11px] text-[13.5px] font-semibold bg-success/[0.12] border border-success/30 text-success-soft transition-colors hover:bg-success/20">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
            XLSX
          </button>
          {["CSV", "PDF"].map((fmt) => (
            <button key={fmt} onClick={() => toast(`Экспорт в ${fmt} начат`)} className="px-4 py-[11px] rounded-[11px] bg-white/5 border border-white/10 text-ink text-[13.5px] font-semibold transition-colors hover:bg-white/[0.09]">
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* ---------- Плитки показателей ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatTile label="Позиций" value={report.items} separator />
        <StatTile label="Клиник" value={report.clinics} />
        <StatTile label="Средняя экономия" value={report.savings} suffix="%" accent="#5BE892" />
        <StatTile label="Файлов" value={report.files} />
      </div>

      {/* ---------- Сравнение цен ---------- */}
      <div className="rounded-[20px] bg-white/[0.025] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="font-display font-semibold text-[15.5px]">Сравнение цен по услугам</div>
          <span className="text-xs text-ink/40">лучшая цена выделена</span>
        </div>

        {/* Десктоп: таблица */}
        <div className="hidden md:block p-[10px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left">
                <th className="px-3 py-[10px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em]">Услуга</th>
                {COLUMNS.map((c) => (
                  <th key={c.key} className="px-3 py-[10px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em]">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.rows.map((r, i) => (
                <tr key={r.service} className="border-t border-white/[0.05]" style={{ animation: `fadeUpItem .4s ${i * 55}ms cubic-bezier(.16,1,.3,1) both` }}>
                  <td className="px-3 py-[11px] text-[13.5px] font-semibold">{r.service}</td>
                  {COLUMNS.map((c) => {
                    const best = r.best === c.key;
                    return (
                      <td key={c.key} className={`px-3 py-[11px] text-[13.5px] ${best ? "font-bold text-success-soft" : "font-medium text-ink/70"}`}>
                        {best ? (
                          <span className="inline-flex items-center gap-[6px]">
                            <span className="w-[6px] h-[6px] rounded-full bg-success shadow-[0_0_6px_#30D158]" />
                            {r[c.key]} ₸
                          </span>
                        ) : (
                          `${r[c.key]} ₸`
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Мобайл: карточки по услугам (удобно листать) */}
        <div className="md:hidden flex flex-col divide-y divide-white/[0.05]">
          {report.rows.map((r, i) => (
            <div key={r.service} className="p-4" style={{ animation: `fadeUpItem .4s ${i * 50}ms cubic-bezier(.16,1,.3,1) both` }}>
              <div className="text-[14px] font-semibold mb-3">{r.service}</div>
              <div className="grid grid-cols-3 gap-2">
                {COLUMNS.map((c) => {
                  const best = r.best === c.key;
                  return (
                    <div key={c.key} className={`rounded-[12px] px-3 py-[10px] border ${best ? "bg-success/[0.1] border-success/30" : "bg-white/[0.03] border-white/[0.06]"}`}>
                      <div className="flex items-center gap-[5px] text-[11px] text-ink/45 mb-[3px]">
                        {best && <span className="w-[5px] h-[5px] rounded-full bg-success" />}
                        {c.label}
                      </div>
                      <div className={`text-[14px] font-bold ${best ? "text-success-soft" : "text-ink/80"}`}>{r[c.key]} ₸</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------- График разброса цен ---------- */}
      <div className="rounded-[20px] bg-white/[0.025] border border-white/[0.07] p-5">
        <div className="font-display font-semibold text-[15.5px]">Разброс цен · МРТ</div>
        <div className="text-[12.5px] text-ink/45 mt-[3px]">по {report.clinics} клиникам, тыс. ₸</div>
        <div className="flex items-end gap-2 h-[170px] mt-[18px]">
          {report.chart.map((v, i) => {
            const isMin = v === min;
            return (
              <div key={i} className="flex-1 flex flex-col justify-end h-full">
                <div
                  className={`w-full rounded-t-[5px] ${isMin ? "bg-bar-min shadow-[0_0_16px_rgba(48,209,88,.4)]" : "bg-bar"}`}
                  style={{ height: `${(v / max) * 100}%`, transition: `height .8s cubic-bezier(.16,1,.3,1) ${i * 45}ms` }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-[14px] pt-[14px] border-t border-white/[0.06]">
          <div><div className="text-[11.5px] text-ink/45">Минимум</div><div className="text-[15px] font-bold text-success-soft">14.9к ₸</div></div>
          <div className="text-center"><div className="text-[11.5px] text-ink/45">Медиана</div><div className="text-[15px] font-bold">19.4к ₸</div></div>
          <div className="text-right"><div className="text-[11.5px] text-ink/45">Максимум</div><div className="text-[15px] font-bold text-danger-soft">28.5к ₸</div></div>
        </div>
      </div>
    </section>
  );
}
