import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchApi, servicesApi } from "../../api";
import { formatNumber } from "../../lib/format";

// ---------- Поиск (ТЗ 4.5 / 4.6) ----------
// Полнотекстовый поиск по услугам и клиникам. Для услуги показываем «кто
// оказывает и по какой цене» (резидент/нерезидент), отсортировано по цене —
// это ключевой сценарий ТЗ. Для клиники — переход в её карточку.

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [data, setData] = useState(null); // { services, partners }
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null); // service_id
  const [providers, setProviders] = useState({}); // { service_id: { loading, partners } }
  const debounce = useRef(null);

  // Дебаунс-поиск по бэкенду.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setData(null); setLoading(false); return; }
    setLoading(true);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      try {
        const res = await searchApi.query(q);
        setData({ services: res?.services || [], partners: res?.partners || [] });
      } catch {
        setData({ services: [], partners: [] });
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(debounce.current);
  }, [query]);

  // Развернуть услугу → подтянуть клиники с ценами (кто оказывает и почём).
  const toggleService = async (svc) => {
    const id = svc.service_id;
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!providers[id]) {
      setProviders((p) => ({ ...p, [id]: { loading: true, partners: [] } }));
      try {
        const res = await servicesApi.partners(id);
        setProviders((p) => ({ ...p, [id]: { loading: false, partners: res?.partners || [] } }));
      } catch {
        setProviders((p) => ({ ...p, [id]: { loading: false, partners: [] } }));
      }
    }
  };

  const services = data?.services || [];
  const partners = data?.partners || [];
  const nothing = data && services.length === 0 && partners.length === 0;

  return (
    <section className="flex flex-col gap-[18px] animate-fade-up">
      {/* Поле поиска */}
      <div className={`flex items-center gap-3 px-[18px] py-[15px] rounded-2xl border transition-all bg-[rgba(12,12,18,0.7)] ${focused ? "border-primary/60 shadow-[0_0_0_4px_rgba(94,92,230,0.12)]" : "border-white/10"}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="6.5" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" />
          <path d="m16 16 4 4" stroke="rgba(245,245,247,.45)" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Услуга, препарат или клиника…"
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-ink text-base font-medium"
        />
        {query && (
          <button onClick={() => setQuery("")} className="grid place-items-center w-6 h-6 rounded-full bg-white/5 border border-white/10 text-ink/60 hover:text-ink shrink-0">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        )}
      </div>

      {!query ? (
        <div className="p-[34px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
          Найдите услугу, чтобы увидеть, в каких клиниках она есть и по какой цене.
        </div>
      ) : loading ? (
        <div className="p-[30px] text-center text-ink/40 text-[14px]">Поиск…</div>
      ) : nothing ? (
        <div className="p-[30px] text-center text-ink/40 text-[14px]">По запросу «{query}» ничего не найдено.</div>
      ) : (
        <>
          {/* ---------- Услуги: кто оказывает и по какой цене ---------- */}
          {services.length > 0 && (
            <div className="flex flex-col gap-[10px]">
              <div className="text-[12px] font-semibold text-ink/45 uppercase tracking-[.04em]">Услуги ({services.length})</div>
              {services.map((svc) => {
                const open = expanded === svc.service_id;
                const prov = providers[svc.service_id];
                return (
                  <div key={svc.service_id} className="rounded-[15px] bg-white/[0.025] border border-white/[0.07] overflow-hidden">
                    <button onClick={() => toggleService(svc)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/[0.02]">
                      <span className="grid place-items-center w-10 h-10 rounded-[12px] bg-primary/[0.12] border border-primary/25 shrink-0">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2-7 4 14 2-7h6" /></svg>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[14.5px] font-semibold truncate">{svc.service_name}</div>
                        {svc.category && <div className="text-[12px] text-ink/45 mt-[2px]">{svc.category}</div>}
                      </div>
                      <span className="text-[12.5px] text-ink/45 shrink-0">{open ? "скрыть" : "кто оказывает →"}</span>
                    </button>

                    {open && (
                      <div className="border-t border-white/[0.06] p-3 animate-fade-up">
                        {prov?.loading ? (
                          <div className="p-4 text-center text-ink/40 text-[13px]">Загрузка цен…</div>
                        ) : !prov?.partners?.length ? (
                          <div className="p-4 text-center text-ink/40 text-[13px]">Пока ни одна клиника не предлагает эту услугу.</div>
                        ) : (
                          <div className="flex flex-col gap-[8px]">
                            <div className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 text-[11px] font-semibold text-ink/40 uppercase tracking-[.04em]">
                              <span>Клиника</span><span className="text-right">Резидент</span><span className="text-right">Нерезидент</span>
                            </div>
                            {prov.partners.map((p, idx) => (
                              <button
                                key={p.partner_id}
                                onClick={() => navigate(`/app/partner/${p.partner_id}`)}
                                className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-[11px] rounded-[12px] bg-white/[0.03] border border-white/[0.06] text-left transition-all hover:border-primary/30 hover:bg-primary/[0.06]"
                              >
                                <div className="min-w-0">
                                  <div className="text-[13.5px] font-semibold truncate flex items-center gap-2">
                                    {p.partner_name}
                                    {idx === 0 && <span className="text-[10px] font-bold px-[6px] py-[1px] rounded-full bg-success/[0.14] text-success-soft border border-success/30">дешевле всех</span>}
                                  </div>
                                  <div className="text-[11.5px] text-ink/45">{p.city || "—"}</div>
                                </div>
                                <div className={`text-right text-[14px] font-bold tabular-nums ${idx === 0 ? "text-success-soft" : "text-ink/85"}`}>{formatNumber(p.price_resident_kzt || 0)} ₸</div>
                                <div className="text-right text-[13px] text-ink/55 tabular-nums">{p.price_nonresident_kzt != null ? formatNumber(p.price_nonresident_kzt) + " ₸" : "—"}</div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ---------- Клиники ---------- */}
          {partners.length > 0 && (
            <div className="flex flex-col gap-[10px]">
              <div className="text-[12px] font-semibold text-ink/45 uppercase tracking-[.04em]">Клиники ({partners.length})</div>
              {partners.map((p) => (
                <button
                  key={p.partner_id}
                  onClick={() => navigate(`/app/partner/${p.partner_id}`)}
                  className="group flex items-center gap-[14px] px-[18px] py-[15px] rounded-[15px] bg-white/[0.025] border border-white/[0.07] text-left transition-all hover:border-primary/35 hover:bg-primary/[0.06]"
                >
                  <div className="grid place-items-center w-[44px] h-[44px] rounded-[13px] font-display font-bold text-[17px] text-white shrink-0 bg-brand">
                    {(p.name || "?").replace(/[«"'»]/g, "").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[15px] truncate">{p.name}</div>
                    <div className="text-[12.5px] text-ink/45 truncate">{[p.city, p.address].filter(Boolean).join(" · ") || "Клиника-партнёр"}</div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(245,245,247,.3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 6 6 6-6 6" /></svg>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
