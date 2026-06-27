import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { partnersApi } from "../../api";
import { toClinicCard } from "../../lib/partnerCard";

const fmt = (v) =>
  v == null ? "—" : Math.round(v).toLocaleString("ru-RU").replace(/,/g, " ");

// Экспорт прайса клиники в CSV из реальных данных.
function exportCsv(clinicName, services) {
  const lines = [["Услуга", "Резидент (₸)", "Нерезидент (₸)"]];
  services.forEach((s) => lines.push([s.service, s.resident, s.nonResident]));
  const csv = lines
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `price_${clinicName}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Подсветка совпадения поискового запроса в названии услуги.
function highlight(text, q) {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-primary/30 text-ink rounded px-[2px]">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function PartnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [clinic, setClinic] = useState(null);
  const [services, setServices] = useState(null); // null = загрузка
  const [effectiveDate, setEffectiveDate] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState(""); // поиск по прайсу
  const [searchFocused, setSearchFocused] = useState(false);

  // Загрузка: сначала бэкенд (видно всем), иначе локальный фолбэк.
  useEffect(() => {
    let alive = true;
    setClinic(null);
    setServices(null);
    setError(false);
    (async () => {
      try {
        const [partner, price] = await Promise.all([partnersApi.get(id), partnersApi.services(id)]);
        if (!alive) return;
        setClinic(toClinicCard(partner));
        const items = (price?.items || []).map((it) => ({
          service: it.service_name || it.service_name_raw,
          resident: fmt(it.price_resident_kzt),
          nonResident: fmt(it.price_nonresident_kzt),
          date: it.effective_date,
        }));
        setServices(items);
        const latest = items.map((i) => i.date).filter(Boolean).sort().pop();
        setEffectiveDate(latest || null);
      } catch {
        if (alive) { setError(true); setServices([]); }
      }
    })();
    return () => { alive = false; };
  }, [id]);

  const dateLabel = effectiveDate ? new Date(effectiveDate).toLocaleDateString("ru-RU") : null;

  // Фильтрация прайса по названию услуги/препарата (поиск).
  const q = query.trim().toLowerCase();
  const filtered = (services || []).filter((s) => s.service.toLowerCase().includes(q));

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* Назад */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-ink/60 transition-colors hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Назад
      </button>

      {error ? (
        <div className="p-[40px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
          Клиника не найдена или бэкенд недоступен.
        </div>
      ) : !clinic ? (
        <div className="p-[40px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
          Загрузка клиники…
        </div>
      ) : (
        <>
          {/* ---------- Шапка клиники ---------- */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-center sm:justify-between px-5 sm:px-6 py-[22px] rounded-[22px] border border-primary/25 bg-brand-soft">
            <div className="flex items-center gap-4">
              <div className="grid place-items-center w-[56px] h-[56px] rounded-[16px] font-display font-bold text-[22px] text-white shrink-0" style={{ background: clinic.gradient }}>
                {clinic.initial}
              </div>
              <div className="min-w-0">
                <div className="font-display font-semibold text-xl">{clinic.name}</div>
                <div className="text-[13px] text-ink/50 mt-[3px]">{clinic.meta}</div>
              </div>
            </div>
            {/* Дата актуальности прайса (effective_date из ТЗ) */}
            {dateLabel && (
              <div className="inline-flex items-center gap-[7px] self-start px-[13px] py-[7px] rounded-[10px] text-[12.5px] font-semibold bg-success/[0.12] border border-success/30 text-success-soft">
                <span className="w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_#30D158]" />
                Прайс актуален · {dateLabel}
              </div>
            )}
          </div>

          {/* ---------- Контакты ---------- */}
          <div className="grid sm:grid-cols-3 gap-[14px]">
            {[
              { label: "Город", value: clinic.city || "—", icon: <><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></> },
              { label: "Телефон", value: clinic.contact_phone || "—", icon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 18l-2 2c-9 0-15-6-15-15z" /> },
              { label: "Email", value: clinic.contact_email || "—", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></> },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-3 px-4 py-4 rounded-[16px] bg-white/[0.025] border border-white/[0.07]">
                <span className="grid place-items-center w-10 h-10 rounded-[11px] bg-primary/[0.12] border border-primary/25 shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
                </span>
                <div className="min-w-0">
                  <div className="text-[12px] text-ink/45">{c.label}</div>
                  <div className="text-[14px] font-semibold truncate">{c.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* ---------- Полный прайс (резидент / нерезидент) ---------- */}
          <div className="rounded-[20px] bg-white/[0.025] border border-white/[0.07] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="font-display font-semibold text-[15.5px]">Прайс-лист клиники</div>
              {services?.length > 0 && (
                <button onClick={() => exportCsv(clinic.name, services)} className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-[12.5px] font-semibold transition-colors hover:bg-white/[0.09]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
                  Экспорт
                </button>
              )}
            </div>

            {services === null ? (
              <div className="p-[30px] text-center text-ink/40 text-[14px]">Загрузка прайса…</div>
            ) : services.length === 0 ? (
              <div className="p-[30px] text-center text-ink/40 text-[14px]">У этой клиники пока нет позиций в базе.</div>
            ) : (
              <>
                {/* Поиск по прайсу */}
                <div className="px-[14px] pt-[14px]">
                  <div className={`flex items-center gap-[10px] px-[14px] py-[11px] rounded-[12px] border transition-all bg-[rgba(12,12,18,0.7)] ${searchFocused ? "border-primary/60 shadow-[0_0_0_4px_rgba(94,92,230,0.12)]" : "border-white/10"}`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <circle cx="11" cy="11" r="6.5" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" />
                      <path d="m16 16 4 4" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onFocus={() => setSearchFocused(true)}
                      onBlur={() => setSearchFocused(false)}
                      placeholder="Поиск услуги или препарата в прайсе…"
                      className="flex-1 min-w-0 bg-transparent border-none outline-none text-ink text-[14.5px] font-medium"
                    />
                    {query && (
                      <button onClick={() => setQuery("")} className="grid place-items-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-ink/60 hover:text-ink shrink-0" title="Очистить">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  <div className="px-1 mt-2 text-[12px] text-ink/40">
                    {q ? `Найдено ${filtered.length} из ${services.length}` : `Всего позиций: ${services.length}`}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <div className="p-[30px] text-center text-ink/40 text-[14px]">
                    По запросу «{query}» ничего не найдено.
                  </div>
                ) : (
                  <>
                    {/* Десктоп: таблица */}
                    <div className="hidden md:block p-[10px]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-left">
                            {["Услуга", "Резидент", "Нерезидент"].map((h) => (
                              <th key={h} className="px-3 py-[10px] text-[11.5px] font-semibold text-ink/40 uppercase tracking-[.04em]">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((s, i) => (
                            <tr key={`${s.service}-${i}`} className="border-t border-white/[0.05]" style={{ animation: `fadeUpItem .4s ${Math.min(i, 12) * 40}ms cubic-bezier(.16,1,.3,1) both` }}>
                              <td className="px-3 py-[11px] text-[13.5px] font-semibold">{highlight(s.service, q)}</td>
                              <td className="px-3 py-[11px] text-[13.5px] text-ink/75">{s.resident} ₸</td>
                              <td className="px-3 py-[11px] text-[13.5px] text-ink/55">{s.nonResident} ₸</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Мобайл: карточки услуг с двумя ценами */}
                    <div className="md:hidden flex flex-col divide-y divide-white/[0.05]">
                      {filtered.map((s, i) => (
                        <div key={`${s.service}-${i}`} className="p-4" style={{ animation: `fadeUpItem .4s ${Math.min(i, 12) * 40}ms cubic-bezier(.16,1,.3,1) both` }}>
                          <div className="text-[14px] font-semibold mb-3">{highlight(s.service, q)}</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-[12px] px-3 py-[10px] bg-white/[0.03] border border-white/[0.06]">
                              <div className="text-[11px] text-ink/45 mb-[3px]">Резидент</div>
                              <div className="text-[14px] font-bold text-ink/85">{s.resident} ₸</div>
                            </div>
                            <div className="rounded-[12px] px-3 py-[10px] bg-white/[0.03] border border-white/[0.06]">
                              <div className="text-[11px] text-ink/45 mb-[3px]">Нерезидент</div>
                              <div className="text-[14px] font-bold text-ink/65">{s.nonResident} ₸</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
