import { useEffect, useState } from "react";
import { ADMIN_WEEK_CHART, ADMIN_JOBS } from "../../data/mock";
import StatTile from "../../components/ui/StatTile";
import { dashboardApi, archivesApi } from "../../api";

// Статусы обработки документа (бэкенд) → бейдж (Tailwind-классы).
const ST_DONE = { label: "Готово", cls: "bg-success/[0.12] border-success/30 text-success-soft", dot: "bg-success-soft" };
const ST_PROC = { label: "Обработка", cls: "bg-primary/[0.14] border-primary/30 text-lav", dot: "bg-lav" };
const ST_PEND = { label: "В очереди", cls: "bg-primary/[0.1] border-primary/[0.22] text-lav", dot: "bg-lav" };
const ST_REVIEW = { label: "На ревью", cls: "bg-[rgba(255,193,94,0.12)] border-[rgba(255,193,94,0.3)] text-[#FFD37E]", dot: "bg-[#FFD37E]" };
const ST_ERR = { label: "Ошибка", cls: "bg-danger/[0.12] border-danger/30 text-danger-soft", dot: "bg-danger-soft" };

const STATUS_STYLE = {
  done: ST_DONE, processing: ST_PROC, pending: ST_PEND, needs_review: ST_REVIEW, error: ST_ERR,
  // фолбэк для демо-данных (русские статусы)
  Готово: ST_DONE, Обработка: ST_PROC, Ошибка: ST_ERR,
};

// Полоса состояния системы (анимируется по ширине при монтировании).
function SystemBar({ label, percent, accent }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(percent), 50);
    return () => clearTimeout(t);
  }, [percent]);
  return (
    <div>
      <div className="flex justify-between text-[13px] mb-[7px]">
        <span className="text-ink/60">{label}</span>
        <span className="font-bold" style={accent ? { color: accent } : undefined}>{percent}%</span>
      </div>
      <div className="h-[7px] rounded-[4px] bg-white/[0.06]">
        <div className="h-full rounded-[4px] bg-progress transition-[width] duration-[1100ms] ease-[cubic-bezier(.16,1,.3,1)]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

// Демо-задачи в формате таблицы (фолбэк).
const MOCK_JOBS = ADMIN_JOBS.map((j) => ({
  title: j.user,
  files: j.files,
  items: j.items,
  status: j.status,
  time: j.time,
}));

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState(MOCK_JOBS);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [s, docs] = await Promise.all([
          dashboardApi.stats(),
          archivesApi.list({}),
        ]);
        if (!alive) return;
        setStats(s);
        if (Array.isArray(docs) && docs.length) {
          setJobs(
            docs.slice(0, 8).map((d) => ({
              title: d.file_name,
              files: (d.file_format || "—").toUpperCase(),
              items: d.parse_status === "error" ? "—" : "✓",
              status: d.parse_status,
              time: d.parsed_at ? new Date(d.parsed_at).toLocaleString("ru-RU") : "—",
            }))
          );
        }
      } catch {
        // бэкенд недоступен — остаёмся на демо-данных
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const max = Math.max(...ADMIN_WEEK_CHART);
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  // Живые показатели, если есть; иначе демо-числа.
  const docsTotal = stats?.documents?.total ?? 1840;
  const normRate = stats?.items?.normalization_rate_pct ?? 99;
  const partners = stats?.partners ?? 1240;
  const unmatched = stats?.items?.unmatched ?? 0;
  const anomalies = stats?.items?.anomalies ?? 0;
  const itemsTotal = stats?.items?.total ?? 1;
  const queueLoad = Math.min(100, Math.round((unmatched / Math.max(itemsTotal, 1)) * 100));

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* ---------- Показатели платформы ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatTile label="Документов" value={docsTotal} separator />
        <StatTile label="Нормализация" value={normRate} decimals={1} suffix="%" accent="#5BE892" />
        <StatTile label="Клиник в базе" value={partners} separator />
        <StatTile label="В очереди ревью" value={unmatched + anomalies} />
      </div>

      {/* ---------- График недели + состояние системы ---------- */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] p-[22px]">
          <div className="flex items-center justify-between">
            <div className="font-display font-semibold text-base">Обработок за неделю</div>
            <span className="inline-flex items-center gap-[6px] text-xs text-ink/45">
              <span className="w-[9px] h-[9px] rounded-[3px] bg-primary-400" />задачи
            </span>
          </div>
          <div className="flex items-end gap-[14px] h-[200px] mt-6">
            {ADMIN_WEEK_CHART.map((v, i) => {
              const peak = v === max;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className={`w-full rounded-t-[7px] ${peak ? "bg-bar-peak shadow-[0_0_20px_rgba(94,92,230,.5)]" : "bg-bar"}`}
                    style={{ height: `${(v / max) * 100}%`, transition: `height .9s cubic-bezier(.16,1,.3,1) ${i * 70}ms` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-3 text-[11.5px] text-ink/40">
            {days.map((d) => <span key={d}>{d}</span>)}
          </div>
        </div>

        <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] p-[22px]">
          <div className="font-display font-semibold text-base mb-[18px]">Состояние системы</div>
          <div className="flex flex-col gap-4">
            <SystemBar label="Автонормализация" percent={Math.round(normRate)} accent="#5BE892" />
            <SystemBar label="Загрузка очереди ревью" percent={queueLoad} />
            <SystemBar label="Документов с ошибкой" percent={stats ? Math.round(((stats.documents?.errors ?? 0) / Math.max(stats.documents?.total ?? 1, 1)) * 100) : 4} />
          </div>
        </div>
      </div>

      {/* ---------- Последние обработки ---------- */}
      <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] overflow-hidden">
        <div className="px-[22px] py-4 border-b border-white/[.06] font-display font-semibold text-base">Последние обработки</div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[560px]">
            <thead>
              <tr>
                {["Документ", "Формат", "Позиции", "Статус", "Время"].map((h, i) => (
                  <th key={h} className={`py-[11px] px-[14px] first:pl-[22px] last:pr-[22px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em] ${i === 4 ? "text-right" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => {
                const s = STATUS_STYLE[j.status] || STATUS_STYLE.pending;
                return (
                  <tr key={i} className="border-t border-white/[.05]" style={{ animation: `fadeUpItem .4s ${i * 50}ms cubic-bezier(.16,1,.3,1) both` }}>
                    <td className="py-[13px] px-[22px] text-[13.5px] font-semibold max-w-[260px] truncate">{j.title}</td>
                    <td className="py-[13px] px-[14px] text-[13.5px] text-ink/65">{j.files}</td>
                    <td className="py-[13px] px-[14px] text-[13.5px] text-ink/65">{j.items}</td>
                    <td className="py-[13px] px-[14px]">
                      <span className={`inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-lg text-xs font-semibold border ${s.cls}`}>
                        <span className={`w-[6px] h-[6px] rounded-full ${s.dot}`} />{s.label}
                      </span>
                    </td>
                    <td className="py-[13px] px-[22px] text-[13px] text-ink/45 text-right">{j.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
