import { useEffect, useState } from "react";
import { ADMIN_WEEK_CHART, ADMIN_JOBS } from "../../data/mock";
import StatTile from "../../components/ui/StatTile";

// Цвета бейджа статуса задачи.
const STATUS_STYLE = {
  Готово: { color: "#5BE892", bg: "rgba(48,209,88,.12)", border: "rgba(48,209,88,.3)" },
  Обработка: { color: "#9DB0FF", bg: "rgba(94,92,230,.14)", border: "rgba(94,92,230,.3)" },
  Ошибка: { color: "#FF8B85", bg: "rgba(255,95,87,.12)", border: "rgba(255,95,87,.3)" },
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
      <div className="h-[7px] rounded-[4px] bg-white/[.06]">
        <div className="h-full rounded-[4px]" style={{ width: `${width}%`, background: "linear-gradient(90deg,#6E8BFF,#A78BFA)", transition: "width 1.1s cubic-bezier(.16,1,.3,1)" }} />
      </div>
    </div>
  );
}

export default function AdminPage() {
  const max = Math.max(...ADMIN_WEEK_CHART);
  const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* ---------- Показатели платформы ---------- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]">
        <StatTile label="Пользователей" value={1840} separator trend="+12%" />
        <StatTile label="Обработок сегодня" value={326} trend="+8%" />
        <StatTile label="Клиник в базе" value={1240} separator trend="+3%" />
        <StatTile label="Аптайм" value={99.98} decimals={2} suffix="%" trend="30 дн" />
      </div>

      {/* ---------- График недели + состояние системы ---------- */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="rounded-[20px] bg-white/[.025] border border-white/[.07] p-[22px]">
          <div className="flex items-center justify-between">
            <div className="font-display font-semibold text-base">Обработок за неделю</div>
            <span className="inline-flex items-center gap-[6px] text-xs text-ink/45">
              <span className="w-[9px] h-[9px] rounded-[3px]" style={{ background: "#6E8BFF" }} />задачи
            </span>
          </div>
          <div className="flex items-end gap-[14px] h-[200px] mt-6">
            {ADMIN_WEEK_CHART.map((v, i) => {
              const peak = v === max;
              return (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-t-[7px]"
                    style={{
                      height: `${(v / max) * 100}%`,
                      background: peak ? "linear-gradient(180deg,#A78BFA,#5E5CE6)" : "linear-gradient(180deg,rgba(110,139,255,.8),rgba(94,92,230,.25))",
                      boxShadow: peak ? "0 0 20px rgba(94,92,230,.5)" : "none",
                      transition: `height .9s cubic-bezier(.16,1,.3,1) ${i * 70}ms`,
                    }}
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
            <SystemBar label="Точность OCR" percent={99} accent="#5BE892" />
            <SystemBar label="Загрузка очереди" percent={42} />
            <SystemBar label="Хранилище" percent={68} />
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
                {["Пользователь", "Файлов", "Позиций", "Статус", "Время"].map((h, i) => (
                  <th key={h} className="py-[11px] px-[14px] first:pl-[22px] last:pr-[22px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em]" style={{ textAlign: i === 4 ? "right" : "left" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ADMIN_JOBS.map((j, i) => {
                const s = STATUS_STYLE[j.status];
                return (
                  <tr key={i} className="border-t border-white/[.05]" style={{ animation: `fadeUpItem .4s ${i * 50}ms cubic-bezier(.16,1,.3,1) both` }}>
                    <td className="py-[13px] px-[22px] text-[13.5px] font-semibold">{j.user}</td>
                    <td className="py-[13px] px-[14px] text-[13.5px] text-ink/65">{j.files}</td>
                    <td className="py-[13px] px-[14px] text-[13.5px] text-ink/65">{j.items}</td>
                    <td className="py-[13px] px-[14px]">
                      <span className="inline-flex items-center gap-[6px] px-[11px] py-[5px] rounded-lg text-xs font-semibold border" style={{ background: s.bg, borderColor: s.border, color: s.color }}>
                        <span className="w-[6px] h-[6px] rounded-full" style={{ background: s.color }} />{j.status}
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
