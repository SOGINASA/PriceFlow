import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import usePartnerStore from "../../store/usePartnerStore";
import useAuthStore from "../../store/useAuthStore";
import { CLINICS } from "../../data/mock";
import { useToast } from "../../components/ui/Toast";
import PriceHistory from "../../components/shared/PriceHistory";
import { formatNumber, formatDate } from "../../lib/format";

// Строка прайса с разворачиваемой историей цен (видна всем пользователям).
function ServiceRow({ item }) {
  const [open, setOpen] = useState(false);
  const changes = item.history?.length || 0;
  return (
    <div className="rounded-[14px] bg-white/[0.025] border border-white/[0.07] overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold truncate">{item.name}</div>
          <div className="text-[12px] text-ink/45 mt-[2px]">
            {item.category} · действует с {formatDate(item.effectiveDate)}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[15px] font-bold tabular-nums text-success-soft">{formatNumber(item.resident)} ₸</div>
          <div className="text-[12px] text-ink/45">нерезидент {formatNumber(item.nonResident)} ₸</div>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`grid place-items-center w-9 h-9 rounded-[10px] border text-[12px] font-semibold shrink-0 transition-colors ${open ? "bg-primary/[0.14] border-primary/30 text-lav" : "bg-white/5 border-white/10 text-ink/60 hover:bg-white/[0.09]"}`}
          title="История цен"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-white/[0.06] animate-fade-up">
          <div className="text-[12px] font-semibold text-ink/55 my-2">
            История изменения цены{changes ? ` · ${changes + 1} версии` : ""}
          </div>
          <PriceHistory item={item} />
        </div>
      )}
    </div>
  );
}

export default function PartnerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { role, partnerId } = useAuthStore();

  // Источник правды — стор партнёров (туда же пишет кабинет клиники).
  const clinic = usePartnerStore((s) => s.clinics[id]) || CLINICS.find((c) => c.id === id);
  const services = usePartnerStore((s) => s.prices[id] || []);

  if (!clinic) {
    return (
      <section className="animate-fade-up">
        <div className="p-8 text-center text-ink/50">Клиника не найдена.</div>
      </section>
    );
  }

  // Это моя клиника? (партнёр смотрит свою страницу) → даём кнопку редактирования.
  const isOwner = role === "partner" && partnerId === id;
  // Дата актуальности = самая поздняя дата среди позиций.
  const latestDate = services.map((s) => s.effectiveDate).filter(Boolean).sort().pop();
  const cheapest = services.reduce((min, s) => (min == null || s.resident < min ? s.resident : min), null);

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* Назад */}
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 self-start text-[13.5px] font-semibold text-ink/60 transition-colors hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        Назад
      </button>

      {/* Шапка клиники */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 sm:px-6 py-[22px] rounded-[22px] border border-primary/25 bg-brand-soft">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid place-items-center w-[56px] h-[56px] rounded-[16px] font-display font-bold text-[22px] text-white shrink-0" style={{ background: clinic.gradient }}>
            {clinic.initial}
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-xl truncate">{clinic.name}</div>
            <div className="text-[13px] text-ink/50 mt-[3px] truncate">{clinic.city} · {clinic.description || clinic.meta}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start shrink-0">
          {isOwner && (
            <Link to="/app/my-prices" className="inline-flex items-center gap-2 px-[13px] py-[8px] rounded-[10px] bg-brand text-white text-[12.5px] font-semibold shadow-brand">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
              Редактировать прайс
            </Link>
          )}
          <div className="inline-flex items-center gap-[7px] px-[13px] py-[7px] rounded-[10px] text-[12.5px] font-semibold bg-success/[0.12] border border-success/30 text-success-soft">
            <span className="w-[7px] h-[7px] rounded-full bg-success shadow-[0_0_8px_#30D158]" />
            Прайс актуален · {formatDate(latestDate)}
          </div>
        </div>
      </div>

      {/* Контакты */}
      <div className="grid sm:grid-cols-3 gap-[14px]">
        {[
          { label: "Город", value: clinic.city || "—", icon: <><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></> },
          { label: "Телефон", value: clinic.phone || "+7 (727) 350-12-00", icon: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 18l-2 2c-9 0-15-6-15-15z" /> },
          { label: "Email", value: clinic.email || "info@clinic.kz", icon: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></> },
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

      {/* Прайс-лист с историей цен */}
      <div className="rounded-[20px] bg-white/[0.025] border border-white/[0.07] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="font-display font-semibold text-[15.5px]">Прайс-лист клиники</div>
          <div className="flex items-center gap-3">
            {cheapest != null && <span className="text-[12.5px] text-ink/45">от {formatNumber(cheapest)} ₸</span>}
            <button onClick={() => toast("Экспорт прайса начат")} className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-[12.5px] font-semibold hover:bg-white/[0.09]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m0 12-4-4m4 4 4-4M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" /></svg>
              Экспорт
            </button>
          </div>
        </div>
        <div className="p-3 flex flex-col gap-[10px]">
          <div className="px-1 text-[12px] text-ink/40">
            Нажмите на <span className="text-lav">часы</span> у позиции, чтобы посмотреть, как менялась цена.
          </div>
          {services.map((it) => (
            <ServiceRow key={it.id} item={it} />
          ))}
        </div>
      </div>
    </section>
  );
}
