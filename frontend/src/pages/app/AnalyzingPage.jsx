import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUploadStore from "../../store/useUploadStore";
import { ANALYSIS_LOGS } from "../../data/mock";

const RING_CIRC = 553; // длина прогресс-кольца (r=88)
const PHASES = ["Загрузка", "Распознавание", "Нормализация", "Сравнение"];

export default function AnalyzingPage() {
  const navigate = useNavigate();
  const hasFiles = useUploadStore((s) => s.files.length > 0);
  const [percent, setPercent] = useState(0);
  const [logLines, setLogLines] = useState([]);
  const intervalRef = useRef(null);

  // Если очередь пуста (зашли напрямую) — возвращаем на загрузку.
  useEffect(() => {
    if (!hasFiles) {
      navigate("/app/upload", { replace: true });
      return;
    }
    // Прогресс с псевдослучайным шагом, как в дизайне.
    let p = 0;
    let logIndex = 0;
    intervalRef.current = setInterval(() => {
      p = Math.min(100, p + Math.random() * 3.4 + 1.4);
      setPercent(p);
      // Догоняем журнал по проценту прогресса.
      const target = Math.floor((p / 100) * ANALYSIS_LOGS.length);
      while (logIndex < target && logIndex < ANALYSIS_LOGS.length) {
        const line = ANALYSIS_LOGS[logIndex++];
        setLogLines((prev) => [...prev, line].slice(-6));
      }
      if (p >= 100) {
        clearInterval(intervalRef.current);
        setLogLines(ANALYSIS_LOGS.slice(-6));
        setTimeout(() => navigate("/app/report/r1"), 900);
      }
    }, 95);

    return () => clearInterval(intervalRef.current);
  }, [hasFiles, navigate]);

  const stepIdx = percent >= 100 ? 4 : Math.min(3, Math.floor(percent / 25));
  const ringOffset = RING_CIRC - (RING_CIRC * percent) / 100;

  return (
    <section className="flex flex-col items-center gap-2 pt-[6px] animate-fade-up">
      {/* ---------- Кольцо прогресса ---------- */}
      <div className="relative w-full max-w-[680px] rounded-[26px] border border-white/[0.08] overflow-hidden p-[38px] px-[30px] bg-panel-soft shadow-panel">
        <div className="absolute pointer-events-none rounded-full -top-[30%] left-1/2 -ml-[210px] w-[420px] h-[420px] blur-[50px] bg-[radial-gradient(circle,rgba(94,92,230,.3),transparent_65%)]" />
        <div className="relative flex flex-col items-center">
          <div className="relative w-[200px] h-[200px]">
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <circle cx="100" cy="100" r="88" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="5" />
              <circle cx="100" cy="100" r="88" fill="none" stroke="url(#anGrad)" strokeWidth="6" strokeLinecap="round" strokeDasharray={RING_CIRC} strokeDashoffset={ringOffset} transform="rotate(-90 100 100)" className="transition-[stroke-dashoffset] duration-200 ease-linear" />
              <circle cx="100" cy="100" r="58" fill="none" stroke="#7E7BFF" strokeWidth="1.5" strokeDasharray="5 11" opacity=".6" className="animate-spin-slow [transform-origin:100px_100px]" />
              <circle cx="100" cy="100" r="44" fill="url(#anCore)" />
              <defs>
                <linearGradient id="anGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6E8BFF" /><stop offset="1" stopColor="#A78BFA" /></linearGradient>
                <radialGradient id="anCore" cx="50%" cy="42%" r="62%"><stop offset="0" stopColor="#C9D0FF" /><stop offset="55%" stopColor="#5E5CE6" /><stop offset="100%" stopColor="#2C2470" /></radialGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="font-display font-bold text-[38px] tracking-[-.02em]">{Math.round(percent)}%</div>
              <div className="text-[11.5px] font-semibold text-ink/60 tracking-[.04em] mt-[2px]">{percent >= 100 ? "Готово" : PHASES[stepIdx]}</div>
            </div>
          </div>

          <h2 className="font-display font-semibold text-[22px] mt-[26px]">Обрабатываем ваши прайсы</h2>
          <p className="mt-2 text-[14.5px] text-ink/50 text-center">Распознаём, приводим к единому формату и сравниваем цены</p>

          {/* Шаги */}
          <div className="flex flex-wrap gap-[9px] justify-center mt-6">
            {PHASES.map((label, i) => {
              const done = i < stepIdx;
              const active = i === stepIdx;
              const on = active || done;
              return (
                <div key={i} className={`flex items-center gap-2 px-[14px] py-[9px] rounded-[11px] border transition-all ${on ? "bg-primary/[0.14] border-primary/35" : "bg-white/[0.04] border-white/[0.08]"}`}>
                  <span className={`grid place-items-center w-4 h-4 rounded-full ${done ? "bg-success" : active ? "bg-primary-400" : "bg-ink/25"}`}>
                    {done && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2 5 8.5l4.5-5" stroke="#08080C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </span>
                  <span className={`text-[13px] font-semibold ${on ? "text-ink" : "text-ink/65"}`}>{label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ---------- Журнал обработки ---------- */}
      <div className="w-full max-w-[680px] mt-4 rounded-[18px] border border-white/[0.07] overflow-hidden bg-[rgba(10,10,15,0.7)]">
        <div className="flex items-center gap-[9px] px-4 py-[11px] border-b border-white/[0.06]">
          <span className="w-2 h-2 rounded-full animate-pulse-dot bg-primary-400" />
          <span className="text-[12.5px] font-semibold text-ink/55 font-display">Журнал обработки</span>
        </div>
        <div className="px-4 py-[14px] flex flex-col gap-[7px] h-[148px] overflow-hidden text-[12.5px] font-mono">
          {logLines.map((line, i) => (
            <div key={`${line}-${i}`} className="flex items-center gap-[9px] text-ink/70 animate-log-in">
              <span className="text-success-soft">✓</span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
