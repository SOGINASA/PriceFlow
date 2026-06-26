import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { analyticsApi } from "../../api";

// ---------- Список отчётов ----------
// Сетка карточек сводных отчётов (по городам), построенных из реальных
// данных бэкенда (GET /analytics/reports). Клик по карточке → детальная
// страница конкретного отчёта (/app/report/:id).

// ISO-дата "2026-06-26" → "26 июня 2026".
function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
}

const formatInt = (n) => Number(n || 0).toLocaleString("ru-RU").replace(/,/g, " ");

export default function ReportsListPage() {
  const [reports, setReports] = useState(null); // null = загрузка
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await analyticsApi.reports();
        if (alive) setReports(Array.isArray(data) ? data : []);
      } catch {
        if (alive) { setReports([]); setError(true); }
      }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <section className="flex flex-col gap-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink/70">
          Все отчёты <span className="text-ink/40">({reports?.length ?? 0})</span>
        </div>
        <Link
          to="/app/upload"
          className="inline-flex items-center gap-2 px-[15px] py-[9px] rounded-[11px] bg-brand text-white text-[13px] font-semibold shadow-brand transition-transform hover:-translate-y-[1px]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Новый анализ
        </Link>
      </div>

      {reports === null ? (
        <EmptyBox text="Загрузка отчётов…" />
      ) : reports.length === 0 ? (
        <EmptyBox text={error
          ? "Не удалось загрузить отчёты — проверьте бэкенд."
          : "Отчётов пока нет. Загрузите прайсы, чтобы получить сводный анализ цен."} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-[14px]">
          {reports.map((r, i) => (
            <Link
              key={r.id}
              to={`/app/report/${encodeURIComponent(r.id)}`}
              className="group flex flex-col rounded-[20px] bg-white/[0.025] border border-white/[0.07] p-5 transition-all hover:-translate-y-[3px] hover:border-primary/35 hover:bg-primary/[0.06]"
              style={{ animation: `fadeUpItem .4s ${i * 50}ms cubic-bezier(.16,1,.3,1) both` }}
            >
              {/* Иконка + статус */}
              <div className="flex items-center justify-between mb-4">
                <span className="grid place-items-center w-11 h-11 rounded-[13px] bg-success/[0.14] border border-success/30">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                </span>
                <span className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-lg text-[11.5px] font-semibold bg-success/[0.12] border border-success/30 text-success-soft">
                  <span className="w-[6px] h-[6px] rounded-full bg-success" />Готово
                </span>
              </div>

              {/* Название + дата */}
              <div className="font-display font-semibold text-[16px] leading-snug">{r.title}</div>
              <div className="text-[12.5px] text-ink/45 mt-1">{formatDate(r.date)}</div>

              {/* Мини-показатели */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-white/[0.06]">
                <div>
                  <div className="font-display font-bold text-[18px]">{r.clinics}</div>
                  <div className="text-[11px] text-ink/40">клиник</div>
                </div>
                <div>
                  <div className="font-display font-bold text-[18px]">{formatInt(r.items)}</div>
                  <div className="text-[11px] text-ink/40">позиций</div>
                </div>
                <div>
                  <div className="font-display font-bold text-[18px] text-success-soft">{r.savings}%</div>
                  <div className="text-[11px] text-ink/40">экономия</div>
                </div>
              </div>

              {/* Открыть */}
              <div className="flex items-center gap-1 mt-4 text-[13px] font-semibold text-lav transition-transform group-hover:translate-x-1">
                Открыть отчёт
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyBox({ text }) {
  return (
    <div className="p-[40px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
      {text}
    </div>
  );
}
