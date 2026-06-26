import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CLINICS, REPORT_ROWS } from "../../data/mock";
import { useToast } from "../../components/ui/Toast";
import { partnersApi } from "../../api";
import { toClinicCard } from "../../lib/partnerCard";

// Демо-прайс (фолбэк, если бэкенд недоступен): цена резидента из отчёта +
// цена нерезидента (+15%).
const COLUMN_KEY = { alpha: "alpha", city: "city", health: "health" };

function mockServices(id) {
  const colKey = COLUMN_KEY[id] || "alpha";
  return REPORT_ROWS.map((r) => {
    const resident = Number(r[colKey].replace(/\s/g, ""));
    const nonResident = Math.round((resident * 1.15) / 100) * 100;
    return {
      service: r.service,
      resident: r[colKey],
      nonResident: nonResident.toLocaleString("ru-RU").replace(/,/g, " "),
    };
  });
}

const fmt = (v) =>
  v == null ? "—" : Math.round(v).toLocaleString("ru-RU").replace(/,/g, " ");

export default function PartnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  // По умолчанию — демо-данные; заменяются на ответ API при успешной загрузке.
  const mockClinic = CLINICS.find((c) => c.id === id) || CLINICS[0];
  const [clinic, setClinic] = useState(mockClinic);
  const [services, setServices] = useState(() => mockServices(id));
  const [effectiveDate, setEffectiveDate] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [partner, priceList] = await Promise.all([
          partnersApi.get(id),
          partnersApi.services(id),
        ]);
        if (!alive) return;
        setClinic(toClinicCard(partner));
        const items = (priceList?.items || []).map((it) => ({
          service: it.service_name || it.service_name_raw,
          resident: fmt(it.price_resident_kzt),
          nonResident: fmt(it.price_nonresident_kzt),
          date: it.effective_date,
        }));
        if (items.length) {
          setServices(items);
          const latest = items.map((i) => i.date).filter(Boolean).sort().pop();
          setEffectiveDate(latest || null);
        }
      } catch {
        // бэкенд недоступен — остаёмся на демо-данных
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const dateLabel = effectiveDate
    ? new Date(effectiveDate).toLocaleDateString("ru-RU")
    : "01.06.2026";

  const phone = clinic.contact_phone || "+7 (727) 350-12-00";
  const email = clinic.contact_email || "info@clinic.kz";

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* Назад к поиску */}
      <button onClick={() => navigate("/app/search")} className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-ink/60 transition-colors hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        К поиску клиник
      </button>

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
        <div className="inline-flex items-center gap-[7px] self-start px-[13px] py-[7px] rounded-[10px] text-[12.5px] font-semibold bg-success/[0.12] border border-success/30 text-success-soft">
          <span className="w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_#30D158]" />
          Прайс актуален · {dateLabel}
        </div>
      </div>

      {/* ---------- Контакты ---------- */}
      <div className="grid sm:grid-cols-3 gap-[14px]">
        {[
          { label: "Город", value: clinic.city || "—", icon: <><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></> },
          { label: "Телефон", value: phone, icon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 18l-2 2c-9 0-15-6-15-15z" /> },
          { label: "Email", value: email, icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></> },
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
          <button onClick={() => toast("Экспорт прайса начат")} className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-[12.5px] font-semibold transition-colors hover:bg-white/[0.09]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
            Экспорт
          </button>
        </div>

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
              {services.map((s, i) => (
                <tr key={`${s.service}-${i}`} className="border-t border-white/[0.05]" style={{ animation: `fadeUpItem .4s ${i * 50}ms cubic-bezier(.16,1,.3,1) both` }}>
                  <td className="px-3 py-[11px] text-[13.5px] font-semibold">{s.service}</td>
                  <td className="px-3 py-[11px] text-[13.5px] text-ink/75">{s.resident} ₸</td>
                  <td className="px-3 py-[11px] text-[13.5px] text-ink/55">{s.nonResident} ₸</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Мобайл: карточки услуг с двумя ценами */}
        <div className="md:hidden flex flex-col divide-y divide-white/[0.05]">
          {services.map((s, i) => (
            <div key={`${s.service}-${i}`} className="p-4" style={{ animation: `fadeUpItem .4s ${i * 45}ms cubic-bezier(.16,1,.3,1) both` }}>
              <div className="text-[14px] font-semibold mb-3">{s.service}</div>
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
      </div>
    </section>
  );
}
