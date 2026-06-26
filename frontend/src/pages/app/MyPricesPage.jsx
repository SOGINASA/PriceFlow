import { useState } from "react";
import { usePartnerCabinet } from "../../hooks/usePartnerCabinet";
import { useToast } from "../../components/ui/Toast";
import PriceHistory from "../../components/shared/PriceHistory";
import { formatNumber, formatDate } from "../../lib/format";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Тёмное поле ввода в стиле приложения.
function Input({ label, ...props }) {
  return (
    <label className="flex flex-col gap-[6px] flex-1 min-w-0">
      {label && <span className="text-[12px] font-semibold text-ink/55">{label}</span>}
      <input
        {...props}
        className="w-full px-[13px] py-[11px] rounded-[11px] text-ink text-[14px] outline-none border bg-[rgba(12,12,18,0.7)] border-white/10 focus:border-primary/60 focus:shadow-[0_0_0_4px_rgba(94,92,230,0.12)] transition-all"
      />
    </label>
  );
}

export default function MyPricesPage() {
  const toast = useToast();
  // Данные и действия: бэкенд (если вошли партнёром) или локальный фолбэк.
  const { items: services, addService, updatePrice, updateService, removeService } = usePartnerCabinet();

  const [adding, setAdding] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", category: "", resident: "", nonResident: "", effectiveDate: todayISO() });
  const [editPriceId, setEditPriceId] = useState(null);
  const [priceForm, setPriceForm] = useState({ resident: "", nonResident: "", effectiveDate: todayISO() });
  const [editInfoId, setEditInfoId] = useState(null);
  const [infoForm, setInfoForm] = useState({ name: "", category: "" });
  const [openHistory, setOpenHistory] = useState(null);

  // Обёртка: показать ошибку, если действие (API) упало.
  const run = async (fn, okMsg) => {
    try {
      await fn();
      if (okMsg) toast(okMsg);
    } catch {
      toast("Не удалось сохранить — проверьте подключение к серверу");
    }
  };

  // --- добавление ---
  const submitAdd = () => {
    if (!addForm.name.trim() || !addForm.resident) {
      toast("Укажите название и цену резидента");
      return;
    }
    run(async () => {
      await addService(addForm);
      setAddForm({ name: "", category: "", resident: "", nonResident: "", effectiveDate: todayISO() });
      setAdding(false);
    }, "Услуга добавлена");
  };

  // --- изменение цены ---
  const startEditPrice = (it) => {
    setEditPriceId(it.id);
    setPriceForm({ resident: it.resident, nonResident: it.nonResident, effectiveDate: todayISO() });
  };
  const submitPrice = (id) =>
    run(async () => { await updatePrice(id, priceForm); setEditPriceId(null); }, "Цена обновлена · прежняя сохранена в истории");

  // --- редактирование названия ---
  const startEditInfo = (it) => {
    setEditInfoId(it.id);
    setInfoForm({ name: it.name, category: it.category });
  };
  const submitInfo = (id) =>
    run(async () => { await updateService(id, { name: infoForm.name.trim() || "Без названия", category: infoForm.category }); setEditInfoId(null); }, "Сохранено");

  const onDelete = (it) => {
    if (window.confirm(`Удалить «${it.name}» из прайса?`)) {
      run(() => removeService(it.id), "Удалено");
    }
  };

  return (
    <section className="flex flex-col gap-4 animate-fade-up">
      {/* Заголовок + добавить */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink/70">
          Услуг в прайсе <span className="text-ink/40">({services.length})</span>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-2 px-[15px] py-[9px] rounded-[11px] bg-brand text-white text-[13px] font-semibold shadow-brand transition-transform hover:-translate-y-[1px]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Добавить услугу
        </button>
      </div>

      {/* Форма добавления */}
      {adding && (
        <div className="rounded-[18px] bg-white/[0.025] border border-primary/25 p-4 flex flex-col gap-3 animate-fade-up">
          <div className="font-display font-semibold text-[15px]">Новая услуга / препарат</div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input label="Название" placeholder="например, МРТ коленного сустава" value={addForm.name} onChange={(e) => setAddForm({ ...addForm, name: e.target.value })} />
            <Input label="Категория" placeholder="диагностика" value={addForm.category} onChange={(e) => setAddForm({ ...addForm, category: e.target.value })} />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input label="Цена резидент, ₸" type="number" inputMode="numeric" placeholder="0" value={addForm.resident} onChange={(e) => setAddForm({ ...addForm, resident: e.target.value })} />
            <Input label="Цена нерезидент, ₸" type="number" inputMode="numeric" placeholder="0" value={addForm.nonResident} onChange={(e) => setAddForm({ ...addForm, nonResident: e.target.value })} />
            <Input label="Действует с" type="date" value={addForm.effectiveDate} onChange={(e) => setAddForm({ ...addForm, effectiveDate: e.target.value })} />
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-4 py-[10px] rounded-[11px] bg-white/5 border border-white/10 text-ink text-[13.5px] font-semibold hover:bg-white/[0.09]">Отмена</button>
            <button onClick={submitAdd} className="px-5 py-[10px] rounded-[11px] bg-brand text-white text-[13.5px] font-semibold shadow-brand">Добавить</button>
          </div>
        </div>
      )}

      {/* Список услуг */}
      {services.length === 0 ? (
        <div className="p-[34px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
          Прайс пуст. Добавьте первую услугу.
        </div>
      ) : (
        <div className="flex flex-col gap-[12px]">
          {services.map((it) => {
            const isEditingPrice = editPriceId === it.id;
            const isEditingInfo = editInfoId === it.id;
            const showHistory = openHistory === it.id;
            return (
              <div key={it.id} className="rounded-[18px] bg-white/[0.025] border border-white/[0.07] p-4">
                {/* Шапка позиции */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {isEditingInfo ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input value={infoForm.name} onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })} />
                        <Input value={infoForm.category} onChange={(e) => setInfoForm({ ...infoForm, category: e.target.value })} />
                        <button onClick={() => submitInfo(it.id)} className="px-4 rounded-[11px] bg-brand text-white text-[13px] font-semibold shrink-0">OK</button>
                      </div>
                    ) : (
                      <>
                        <div className="text-[15.5px] font-semibold">{it.name}</div>
                        <div className="text-[12.5px] text-ink/45 mt-[2px]">{it.category} · действует с {formatDate(it.effectiveDate)}</div>
                      </>
                    )}
                  </div>
                  {/* Текущие цены */}
                  <div className="text-right shrink-0">
                    <div className="text-[16px] font-bold tabular-nums">{formatNumber(it.resident)} ₸</div>
                    <div className="text-[12px] text-ink/45">нерезидент {formatNumber(it.nonResident)} ₸</div>
                  </div>
                </div>

                {/* Форма изменения цены */}
                {isEditingPrice && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-col gap-3 animate-fade-up">
                    <div className="text-[12.5px] text-ink/55">Новая цена — прежняя сохранится в истории с прежней датой.</div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Input label="Резидент, ₸" type="number" inputMode="numeric" value={priceForm.resident} onChange={(e) => setPriceForm({ ...priceForm, resident: e.target.value })} />
                      <Input label="Нерезидент, ₸" type="number" inputMode="numeric" value={priceForm.nonResident} onChange={(e) => setPriceForm({ ...priceForm, nonResident: e.target.value })} />
                      <Input label="Действует с" type="date" value={priceForm.effectiveDate} onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditPriceId(null)} className="px-4 py-[9px] rounded-[11px] bg-white/5 border border-white/10 text-[13px] font-semibold hover:bg-white/[0.09]">Отмена</button>
                      <button onClick={() => submitPrice(it.id)} className="px-5 py-[9px] rounded-[11px] bg-brand text-white text-[13px] font-semibold shadow-brand">Сохранить цену</button>
                    </div>
                  </div>
                )}

                {/* История цен */}
                {showHistory && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] animate-fade-up">
                    <div className="text-[12.5px] font-semibold text-ink/55 mb-1">История изменения цены</div>
                    <PriceHistory item={it} />
                  </div>
                )}

                {/* Действия */}
                <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/[0.06]">
                  <button onClick={() => startEditPrice(it)} className="inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[10px] bg-primary/[0.14] border border-primary/30 text-lav text-[12.5px] font-semibold hover:bg-primary/20">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                    Изменить цену
                  </button>
                  <button onClick={() => setOpenHistory(showHistory ? null : it.id)} className="inline-flex items-center gap-[6px] px-3 py-[7px] rounded-[10px] bg-white/5 border border-white/10 text-ink/75 text-[12.5px] font-semibold hover:bg-white/[0.09]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                    История {it.history?.length ? `(${it.history.length + 1})` : ""}
                  </button>
                  <button onClick={() => startEditInfo(it)} className="px-3 py-[7px] rounded-[10px] bg-white/5 border border-white/10 text-ink/75 text-[12.5px] font-semibold hover:bg-white/[0.09]">Переименовать</button>
                  <button onClick={() => onDelete(it)} className="ml-auto px-3 py-[7px] rounded-[10px] bg-white/5 border border-white/10 text-danger-soft text-[12.5px] font-semibold hover:bg-danger/[0.12]">Удалить</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
