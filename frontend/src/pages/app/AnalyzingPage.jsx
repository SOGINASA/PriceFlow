import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUploadStore from "../../store/useUploadStore";
import { archivesApi } from "../../api";

const RING_CIRC = 553; // длина прогресс-кольца (r=88)
const PHASES = ["Загрузка", "Распознавание", "Нормализация", "Сравнение"];

export default function AnalyzingPage() {
  const navigate = useNavigate();
  const [percent, setPercent] = useState(0);
  const [logLines, setLogLines] = useState([]);
  const doneRef = useRef(false);   // обработка завершена → кольцо доезжает до 100%
  const navigatedRef = useRef(false);

  // Синхронная обработка происходит ПРЯМО ЗДЕСЬ: отправляем файлы на бэкенд
  // (sync=1), пока запрос выполняется — кольцо «упирается» в 92%. Бэкенд за этот
  // запрос распознаёт, нормализует, строит справочник и пишет всё в БД. После
  // ответа показываем реальный журнал по статусам документов и доводим до 100%.
  useEffect(() => {
    const { pending } = useUploadStore.getState();
    if (!pending?.files?.length) {
      navigate("/app/upload", { replace: true });
      return;
    }

    let alive = true;
    const log = [];
    const pushLog = (line) => {
      log.push(line);
      if (alive) setLogLines([...log].slice(-6));
    };
    pushLog(`Файлов к обработке: ${pending.files.length}`);

    // Кольцо: пока идёт обработка — асимптотически подбирается к 92%; как только
    // ответ получен (doneRef) — доезжает до 100%.
    const ring = setInterval(() => {
      if (!alive) return;
      setPercent((p) => {
        const cap = doneRef.current ? 100 : 92;
        return p < cap ? Math.min(cap, p + Math.max(0.3, (cap - p) * 0.05)) : p;
      });
    }, 70);

    (async () => {
      try {
        // Бэкенд распаковывает ZIP только если он пришёл в поле "file"; обычные
        // прайсы — в поле "files". Поэтому каждый .zip шлём отдельным запросом
        // (поле file), а все не-zip файлы — одним запросом (поле files).
        const isZip = (f) => f.name.toLowerCase().endsWith(".zip");
        const zips = pending.files.filter(isZip);
        const loose = pending.files.filter((f) => !isZip(f));

        const withMeta = (fd) => {
          if (pending.partnerName) fd.append("partner_name", pending.partnerName);
          if (pending.city) fd.append("city", pending.city);
          return fd;
        };

        const requests = [];
        zips.forEach((zip) => {
          const fd = new FormData();
          fd.append("file", zip, zip.name);
          requests.push(archivesApi.upload(withMeta(fd), { sync: true }));
        });
        if (loose.length) {
          const fd = new FormData();
          loose.forEach((f) => fd.append("files", f, f.name));
          requests.push(archivesApi.upload(withMeta(fd), { sync: true }));
        }
        if (zips.length) pushLog(`Распаковка ZIP-архивов: ${zips.length}`);

        // allSettled — один битый архив не должен ронять обработку остальных.
        const settled = await Promise.allSettled(requests);
        if (!alive) return;
        const ids = [];
        let anyOk = false;
        settled.forEach((s) => {
          if (s.status === "fulfilled") { anyOk = true; ids.push(...(s.value?.doc_ids || [])); }
        });
        if (!anyOk) throw new Error("upload failed");

        const statuses = await Promise.all(
          ids.map((id) => archivesApi.status(id).catch(() => null))
        );
        if (!alive) return;

        let totalItems = 0;
        statuses.forEach((d) => {
          if (!d) return;
          const fmt = (d.file_format || "файл").toUpperCase();
          if (d.parse_status === "error") {
            pushLog(`Ошибка обработки · ${d.file_name}`);
          } else {
            totalItems += d.items_count ?? 0;
            pushLog(`${fmt} · ${d.file_name} → ${d.items_count ?? 0} позиций`);
          }
        });
        pushLog("Нормализация и сравнение цен · готово");
        pushLog(`Всего позиций в базе: ${totalItems}`);
        doneRef.current = true;
      } catch (e) {
        if (!alive) return;
        pushLog("Не удалось обработать файлы — проверьте бэкенд");
        setTimeout(() => { if (alive) navigate("/app/upload", { replace: true }); }, 1800);
      }
    })();

    return () => {
      alive = false;
      clearInterval(ring);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Кольцо доехало до 100% → уходим в отчёт.
  useEffect(() => {
    if (percent >= 99.9 && doneRef.current && !navigatedRef.current) {
      navigatedRef.current = true;
      const t = setTimeout(() => {
        useUploadStore.getState().clear();
        navigate("/app/report");
      }, 700);
      return () => clearTimeout(t);
    }
  }, [percent, navigate]);

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
