import { useMemo, useState } from "react";
import { CLINICS } from "../../data/mock";

// ---------- Поиск по клиникам (переиспользуемый) ----------
// Используется и на лендинге, и на экране поиска в приложении.
// Props:
//   placeholder, noneText — тексты (для локализации)
//   onSelect(clinic)      — клик по строке (в приложении -> переход на партнёра)
//   showArrow             — показывать стрелку справа (режим приложения)
export default function ClinicSearch({ placeholder, noneText, onSelect, showArrow = false }) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  // Фильтрация по ключевым словам и названию (без учёта регистра).
  const matched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CLINICS;
    return CLINICS.filter(
      (c) => c.keywords.includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-[10px]">
      {/* Поле ввода */}
      <div
        className="flex items-center gap-3 px-[18px] py-[15px] rounded-2xl border transition-all"
        style={{
          background: "rgba(12,12,18,.7)",
          borderColor: focused ? "rgba(94,92,230,.6)" : "rgba(255,255,255,.1)",
          boxShadow: focused ? "0 0 0 4px rgba(94,92,230,.12)" : "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent border-none outline-none text-ink text-base font-medium"
        />
        <span className="text-xs text-ink/30 border border-white/10 rounded-[7px] px-2 py-[3px]">⌘K</span>
      </div>

      {/* Результаты */}
      {matched.length === 0 ? (
        <div className="p-[30px] text-center text-ink/40 text-[15px] rounded-2xl border border-white/[.06] bg-white/[.015]">
          {noneText}
        </div>
      ) : (
        matched.map((c, i) => (
          <button
            key={c.id}
            onClick={() => onSelect?.(c)}
            className="group flex items-center gap-[14px] px-[18px] py-[15px] rounded-[15px] bg-white/[.025] border border-white/[.07] text-left transition-all hover:border-primary/35 hover:bg-primary/[.08] hover:translate-x-[3px]"
            style={{ animation: `fadeUpItem .4s ${i * 45}ms cubic-bezier(.16,1,.3,1) both` }}
          >
            {/* Аватар-инициал */}
            <div className="grid place-items-center w-[46px] h-[46px] rounded-[13px] font-display font-bold text-[18px] text-white shrink-0" style={{ background: c.gradient }}>
              {c.initial}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-[15.5px]">{c.name}</div>
              <div className="text-[13px] text-ink/45 mt-[2px]">{c.meta}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11.5px] text-ink/40">от</div>
              <div className="font-bold text-[15px]" style={{ color: "#5BE892" }}>{c.from} ₸</div>
            </div>
            {showArrow && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,247,.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            )}
          </button>
        ))
      )}
    </div>
  );
}
