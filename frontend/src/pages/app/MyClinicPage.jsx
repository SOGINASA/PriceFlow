import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usePartnerCabinet } from "../../hooks/usePartnerCabinet";
import { useToast } from "../../components/ui/Toast";

function Field({ label, textarea, ...props }) {
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-semibold text-ink/55">{label}</span>
      {textarea ? (
        <textarea
          {...props}
          rows={3}
          className="w-full px-[14px] py-[12px] rounded-[12px] text-ink text-[14.5px] outline-none border bg-[rgba(12,12,18,0.7)] border-white/10 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(94,92,230,0.12)] transition-all resize-none"
        />
      ) : (
        <input
          {...props}
          className="w-full px-[14px] py-[12px] rounded-[12px] text-ink text-[14.5px] outline-none border bg-[rgba(12,12,18,0.7)] border-white/10 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(94,92,230,0.12)] transition-all"
        />
      )}
    </label>
  );
}

export default function MyClinicPage() {
  const toast = useToast();
  const { clinic, updateClinic } = usePartnerCabinet();
  const [form, setForm] = useState(clinic);

  // Синхронизируем форму, когда клиника загрузится/сменится.
  useEffect(() => setForm(clinic), [clinic]);

  if (!form) return null;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try {
      await updateClinic({
        name: form.name, city: form.city, address: form.address,
        phone: form.phone, email: form.email, description: form.description,
      });
      toast("Профиль клиники сохранён");
    } catch {
      toast("Не удалось сохранить — проверьте подключение к серверу");
    }
  };

  return (
    <section className="flex flex-col gap-5 animate-fade-up max-w-[760px]">
      {/* Превью карточки клиники */}
      <div className="flex items-center justify-between gap-4 px-5 py-[18px] rounded-[20px] border border-primary/25 bg-brand-soft">
        <div className="flex items-center gap-4 min-w-0">
          <div className="grid place-items-center w-[52px] h-[52px] rounded-[15px] font-display font-bold text-[20px] text-white shrink-0" style={{ background: clinic.gradient }}>
            {clinic.initial}
          </div>
          <div className="min-w-0">
            <div className="font-display font-semibold text-lg truncate">{form.name}</div>
            <div className="text-[13px] text-ink/50 truncate">{form.city}</div>
          </div>
        </div>
        <Link to={`/app/partner/${clinic.id}`} className="inline-flex items-center gap-2 px-3 py-2 rounded-[10px] bg-white/5 border border-white/10 text-[12.5px] font-semibold hover:bg-white/[0.09] shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          Публичная страница
        </Link>
      </div>

      {/* Форма профиля */}
      <div className="rounded-[20px] bg-white/[0.025] border border-white/[0.07] p-5 sm:p-6 flex flex-col gap-4">
        <div className="font-display font-semibold text-[15.5px]">Данные клиники</div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1"><Field label="Название" value={form.name || ""} onChange={set("name")} /></div>
          <div className="flex-1"><Field label="Город" value={form.city || ""} onChange={set("city")} /></div>
        </div>
        <Field label="Адрес" value={form.address || ""} onChange={set("address")} />
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1"><Field label="Телефон" value={form.phone || ""} onChange={set("phone")} /></div>
          <div className="flex-1"><Field label="Email" type="email" value={form.email || ""} onChange={set("email")} /></div>
        </div>
        <Field label="Описание / специализация" textarea value={form.description || ""} onChange={set("description")} />

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setForm(clinic)} className="px-5 py-[11px] rounded-[12px] bg-white/5 border border-white/10 text-[14px] font-semibold hover:bg-white/[0.09]">Сбросить</button>
          <button onClick={save} className="px-6 py-[11px] rounded-[12px] bg-brand text-white text-[14px] font-semibold shadow-brand transition-transform hover:-translate-y-[1px]">Сохранить</button>
        </div>
      </div>
    </section>
  );
}
