import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "./AuthLayout";

const RING_CIRC = 490; // длина окружности прогресс-кольца

export default function BiometricPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Начальный режим берём из query (?mode=fp|face).
  const [target, setTarget] = useState(params.get("mode") === "face" ? "face" : "fp");
  const [status, setStatus] = useState("idle"); // idle | scanning | success
  const [ringOffset, setRingOffset] = useState(RING_CIRC);
  const timers = useRef([]);

  // Чистим таймеры при размонтировании/перезапуске.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const reset = (next) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setTarget(next);
    setStatus("idle");
    setRingOffset(RING_CIRC);
  };

  // Запуск «сканирования»: заполняем кольцо, затем показываем успех.
  const scan = () => {
    if (status === "scanning") return;
    setStatus("scanning");
    requestAnimationFrame(() => setRingOffset(0)); // CSS-переход заполнит кольцо
    timers.current.push(setTimeout(() => setStatus("success"), 2050));
    timers.current.push(setTimeout(() => navigate("/app/upload"), 3450));
  };

  const isFp = target === "fp";
  const title = status === "success" ? "Готово" : isFp ? "Настройка отпечатка" : "Настройка Face ID";
  const desc =
    status === "success"
      ? "Биометрия сохранена. Входим в MedPartners…"
      : isFp
      ? "Приложите палец к сенсору, чтобы сохранить отпечаток для входа."
      : "Посмотрите в камеру — система запомнит черты лица для входа.";

  // Бейдж статуса (ожидание / сканирование / успех) — Tailwind-классы.
  const statusBadge = {
    idle: { dot: "bg-primary-400", text: "Ожидание…", wrap: "bg-white/5 border-white/10 text-ink/60" },
    scanning: { dot: "bg-violet", text: "Сканирование…", wrap: "bg-white/5 border-white/10 text-ink/60" },
    success: { dot: "bg-success shadow-[0_0_8px_#30D158]", text: "Успешно · доступ разрешён", wrap: "bg-success/[0.12] border-success/30 text-success-soft" },
  }[status];

  return (
    <AuthLayout>
      <section className="w-full max-w-[440px]">
        <div className="relative overflow-hidden rounded-[26px] border border-white/[0.09] p-9 px-[30px] text-center bg-[rgba(20,20,28,0.72)] backdrop-blur-[22px] shadow-card">
          <div className="absolute pointer-events-none rounded-full -top-[30%] left-1/2 -ml-[170px] w-[340px] h-[340px] blur-[46px] bg-[radial-gradient(circle,rgba(94,92,230,.28),transparent_65%)]" />

          <div className="relative">
            {/* Переключатель режима */}
            <div className="inline-flex gap-1 p-1 rounded-xl bg-white/5 border border-white/[.08] mb-[30px]">
              {[["fp", "Отпечаток"], ["face", "Лицо"]].map(([key, label]) => {
                const on = target === key;
                return (
                  <button
                    key={key}
                    onClick={() => reset(key)}
                    className={`px-4 py-2 rounded-[9px] text-[13px] font-semibold transition-all ${on ? "bg-primary/90 text-white" : "bg-transparent text-ink/55"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Кольцо прогресса + визуал */}
            <div className="relative w-[170px] h-[170px] mx-auto">
              <svg viewBox="0 0 170 170" className="absolute inset-0 w-full h-full">
                <circle cx="85" cy="85" r="78" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="3" />
                <circle
                  cx="85" cy="85" r="78" fill="none" stroke="url(#bioGrad)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={ringOffset}
                  transform="rotate(-90 85 85)"
                  style={{ transition: status === "scanning" ? "stroke-dashoffset 1.9s cubic-bezier(.4,0,.2,1)" : "none" }}
                />
                <defs>
                  <linearGradient id="bioGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#6E8BFF" />
                    <stop offset="1" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Иконка-визуал или галочка успеха */}
              <div className="absolute inset-0 grid place-items-center">
                {status === "success" ? (
                  <svg width="84" height="84" viewBox="0 0 84 84" style={{ animation: "fadeUpItem .4s both" }}>
                    <circle cx="42" cy="42" r="40" fill="rgba(48,209,88,.14)" stroke="#30D158" strokeWidth="2.5" />
                    <path d="M28 43l9 9 19-20" fill="none" stroke="#30D158" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isFp ? (
                  <svg width="92" height="92" viewBox="0 0 120 120" fill="none">
                    <g stroke="#8FA4FF" strokeWidth="2.4" strokeLinecap="round" fill="none">
                      <path d="M60 28c-17 0-31 14-31 31v14" />
                      <path d="M91 73V59c0-17-14-31-31-31" />
                      <path d="M42 78V59a18 18 0 0 1 36 0v22" opacity=".88" />
                      <path d="M53 84V59a7 7 0 0 1 14 0v26" opacity=".72" />
                      <path d="M60 59v28" opacity=".58" />
                    </g>
                  </svg>
                ) : (
                  <svg width="92" height="92" viewBox="0 0 120 120" fill="none">
                    <g stroke="#C9A8FF" strokeWidth="2.6" strokeLinecap="round" fill="none">
                      <path d="M30 44V36a6 6 0 0 1 6-6h8" />
                      <path d="M76 30h8a6 6 0 0 1 6 6v8" />
                      <path d="M90 76v8a6 6 0 0 1-6 6h-8" />
                      <path d="M44 90h-8a6 6 0 0 1-6-6v-8" />
                    </g>
                    <g stroke="#E3D7FF" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".9">
                      <circle cx="50" cy="54" r="2.4" fill="#E3D7FF" stroke="none" />
                      <circle cx="70" cy="54" r="2.4" fill="#E3D7FF" stroke="none" />
                      <path d="M60 56v9" />
                      <path d="M52 72c3 3 13 3 16 0" />
                    </g>
                  </svg>
                )}
              </div>
            </div>

            <h2 className="font-display font-semibold text-[22px] mt-[26px]">{title}</h2>
            <p className="mt-[9px] text-[14.5px] leading-[1.55] text-ink/50 max-w-[300px] mx-auto">{desc}</p>

            {/* Статус */}
            <div className={`mt-[18px] inline-flex items-center gap-2 px-[15px] py-2 rounded-[10px] text-[13px] font-semibold border ${statusBadge.wrap}`}>
              <span className={`w-[7px] h-[7px] rounded-full animate-pulse-dot ${statusBadge.dot}`} />
              {statusBadge.text}
            </div>

            {/* Кнопки */}
            <div className="flex flex-col gap-[10px] mt-[26px]">
              <button
                onClick={status === "success" ? () => navigate("/app/upload") : scan}
                disabled={status === "scanning"}
                className="w-full p-[14px] rounded-[13px] text-white text-[15px] font-semibold transition-all hover:-translate-y-[2px] disabled:opacity-50 disabled:hover:translate-y-0 bg-brand shadow-brand"
              >
                {status === "success" ? "Войти в MedPartners" : status === "scanning" ? "Сканирование…" : "Сканировать"}
              </button>
              <button onClick={() => navigate("/app/upload")} className="w-full p-3 rounded-[13px] bg-transparent text-ink/50 text-sm font-semibold">
                Пропустить пока
              </button>
            </div>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}
