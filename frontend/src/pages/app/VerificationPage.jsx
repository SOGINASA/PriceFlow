import { useEffect, useMemo, useState } from "react";
import { reviewApi, servicesApi, partnersApi, archivesApi } from "../../api";
import { useToast } from "../../components/ui/Toast";

// ---------- Очередь верификации оператора (ТЗ 4.3 / 4.4 / 4.6) ----------
// Две вкладки:
//   unmatched — позиции без привязки к справочнику (ручное сопоставление)
//   anomaly   — позиции с аномалией цены (подтвердить / отклонить)
// Бэкенд: GET /unmatched, GET /needs-review, POST /match, POST /verify.

const fmt = (v) =>
  v == null ? "—" : Math.round(v).toLocaleString("ru-RU").replace(/,/g, " ");

// Как получена подсказка сопоставления (дообучение: метод матчинга).
const METHOD_LABEL = { exact: "точное", fuzzy: "нечёткое", semantic: "семантика", manual: "вручную" };

function Tab({ active, onClick, label, count, accent }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-[9px] px-[18px] py-[11px] rounded-[12px] text-[14px] font-semibold border transition-all"
      style={{
        background: active ? "rgba(94,92,230,.16)" : "rgba(255,255,255,.03)",
        borderColor: active ? "rgba(94,92,230,.4)" : "rgba(255,255,255,.08)",
        color: active ? "#F5F5F7" : "rgba(245,245,247,.6)",
      }}
    >
      {label}
      <span className="grid place-items-center min-w-[22px] h-[22px] px-[6px] rounded-full text-[11.5px] font-bold"
        style={{ background: accent || "rgba(94,92,230,.3)", color: "#fff" }}>
        {count}
      </span>
    </button>
  );
}

export default function VerificationPage() {
  const toast = useToast();
  const [tab, setTab] = useState("unmatched");
  const [loading, setLoading] = useState(true);
  const [unmatched, setUnmatched] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [services, setServices] = useState([]);
  const [partners, setPartners] = useState({});
  const [docNames, setDocNames] = useState({}); // { doc_id: file_name } — исходный документ
  // Локальный выбор услуги/нового названия по item_id.
  const [choice, setChoice] = useState({}); // { [item_id]: { serviceId, newName } }
  // Режим ручной корректировки цены аномалии.
  const [correctId, setCorrectId] = useState(null);
  const [correctForm, setCorrectForm] = useState({ resident: "", nonResident: "" });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [u, a, s, p, docs] = await Promise.all([
        reviewApi.unmatched(),
        reviewApi.needsReview(),
        servicesApi.list({}),
        partnersApi.list({}),
        archivesApi.list({}),
      ]);
      setUnmatched(Array.isArray(u) ? u : []);
      setAnomalies(Array.isArray(a) ? a : []);
      setServices(Array.isArray(s) ? s : []);
      const map = {};
      (Array.isArray(p) ? p : []).forEach((pp) => { map[pp.partner_id] = pp; });
      setPartners(map);
      const dmap = {};
      (Array.isArray(docs) ? docs : []).forEach((d) => { dmap[d.doc_id] = d.file_name; });
      setDocNames(dmap);
    } catch (e) {
      // 401/403 — очереди верификации доступны только админу (см. routes/review.py).
      const msg = String(e?.message || "");
      toast(/\b(401|403)\b/.test(msg)
        ? "Очередь верификации доступна только администратору — войдите как admin"
        : "Не удалось загрузить очередь — проверьте бэкенд");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const partnerName = (id) => partners[id]?.name || "Клиника";
  const sourceName = (docId) => docNames[docId];

  const setItemChoice = (itemId, patch) =>
    setChoice((c) => ({ ...c, [itemId]: { ...c[itemId], ...patch } }));

  // Ручное сопоставление: выбранная услуга справочника или создание новой.
  const handleMatch = async (item) => {
    const c = choice[item.item_id] || {};
    const payload = { item_id: item.item_id };
    if (c.newName?.trim()) payload.new_service_name = c.newName.trim();
    else if (c.serviceId || item.suggestion?.service_id) payload.service_id = c.serviceId || item.suggestion.service_id;
    else return toast("Выберите услугу из справочника или введите новую");

    try {
      const res = await reviewApi.match(payload);
      setUnmatched((list) => list.filter((i) => i.item_id !== item.item_id));
      toast(res?.learned_synonym
        ? "Сопоставлено · синоним выучен (дообучение)"
        : "Позиция сопоставлена");
    } catch {
      toast("Ошибка сопоставления");
    }
  };

  // Верификация аномалии: подтвердить / отклонить.
  const handleVerify = async (item, action) => {
    try {
      await reviewApi.verify({ item_id: item.item_id, action });
      setAnomalies((list) => list.filter((i) => i.item_id !== item.item_id));
      toast(action === "confirm" ? "Цена подтверждена" : "Позиция отклонена");
    } catch {
      toast("Ошибка верификации");
    }
  };

  // Открыть инлайн-корректировку цены аномалии.
  const startCorrect = (item) => {
    setCorrectId(item.item_id);
    setCorrectForm({ resident: item.price_resident_kzt ?? "", nonResident: item.price_nonresident_kzt ?? "" });
  };

  // Сохранить исправленную цену (action=correct → подтверждает и снимает аномалию).
  const handleCorrect = async (item) => {
    try {
      await reviewApi.verify({
        item_id: item.item_id,
        action: "correct",
        price_resident: Number(correctForm.resident) || 0,
        price_nonresident: correctForm.nonResident === "" ? null : Number(correctForm.nonResident),
      });
      setAnomalies((list) => list.filter((i) => i.item_id !== item.item_id));
      setCorrectId(null);
      toast("Цена исправлена и подтверждена");
    } catch {
      toast("Ошибка сохранения");
    }
  };

  const serviceOptions = useMemo(
    () => services.map((s) => ({ value: s.service_id, label: s.service_name })),
    [services]
  );

  return (
    <section className="flex flex-col gap-5 animate-fade-up">
      {/* Вкладки */}
      <div className="flex items-center gap-[10px] flex-wrap">
        <Tab active={tab === "unmatched"} onClick={() => setTab("unmatched")}
             label="Не сопоставлено" count={unmatched.length} />
        <Tab active={tab === "anomaly"} onClick={() => setTab("anomaly")}
             label="Аномалии цен" count={anomalies.length} accent="rgba(255,193,94,.85)" />
        <button onClick={loadAll} className="ml-auto inline-flex items-center gap-2 px-[14px] py-[10px] rounded-[11px] bg-white/5 border border-white/10 text-[13px] font-semibold transition-all hover:bg-white/[.09]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 3v6h-6" /></svg>
          Обновить
        </button>
      </div>

      {loading ? (
        <div className="p-[40px] text-center text-ink/40 text-[14.5px] rounded-[18px] border border-white/[.06] bg-white/[.015]">
          Загрузка очереди…
        </div>
      ) : tab === "unmatched" ? (
        /* ---------- Несопоставленные позиции ---------- */
        unmatched.length === 0 ? (
          <EmptyState text="Несопоставленных позиций нет. Все услуги привязаны к справочнику." />
        ) : (
          <div className="flex flex-col gap-[12px]">
            {unmatched.map((item, i) => {
              const c = choice[item.item_id] || {};
              return (
                <div key={item.item_id} className="rounded-[16px] bg-white/[.025] border border-white/[.07] p-[18px] animate-fade-up" style={{ animationDelay: `${i * 35}ms` }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[15px] font-semibold">{item.service_name_raw}</div>
                      <div className="text-[12.5px] text-ink/45 mt-[3px]">
                        {partnerName(item.partner_id)} · резидент {fmt(item.price_resident_kzt)} ₸
                      </div>
                      {sourceName(item.doc_id) && (
                        <div className="inline-flex items-center gap-[6px] text-[11.5px] text-ink/40 mt-[5px]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>
                          источник: {sourceName(item.doc_id)}
                        </div>
                      )}
                    </div>
                    {item.suggestion && (
                      <div className="inline-flex items-center gap-[7px] px-[11px] py-[6px] rounded-[10px] text-[12px] font-semibold border" style={{ background: "rgba(94,92,230,.12)", borderColor: "rgba(94,92,230,.3)", color: "#9DB0FF" }}>
                        Похоже на: {item.suggestion.service_name} ({Math.round(item.suggestion.score * 100)}%)
                        {item.suggestion.method && (
                          <span className="opacity-60">· {METHOD_LABEL[item.suggestion.method] || item.suggestion.method}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Управление сопоставлением */}
                  <div className="flex flex-wrap items-center gap-[10px] mt-[14px]">
                    <select
                      value={c.serviceId ?? item.suggestion?.service_id ?? ""}
                      onChange={(e) => setItemChoice(item.item_id, { serviceId: e.target.value, newName: "" })}
                      className="flex-1 min-w-[150px] bg-[#0E0E14] border border-white/10 rounded-[11px] px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-primary/50"
                    >
                      <option value="">— выбрать услугу из справочника —</option>
                      {serviceOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className="text-ink/30 text-[13px]">или</span>
                    <input
                      value={c.newName || ""}
                      onChange={(e) => setItemChoice(item.item_id, { newName: e.target.value, serviceId: "" })}
                      placeholder="создать новую услугу"
                      className="flex-1 min-w-[130px] bg-[#0E0E14] border border-white/10 rounded-[11px] px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-primary/50"
                    />
                    <button
                      onClick={() => handleMatch(item)}
                      className="px-[18px] py-[11px] rounded-[11px] text-white text-[13.5px] font-semibold transition-transform hover:-translate-y-[1px] whitespace-nowrap"
                      style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", boxShadow: "0 8px 22px rgba(94,92,230,.35)" }}
                    >
                      Сопоставить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ---------- Аномалии цен ---------- */
        anomalies.length === 0 ? (
          <EmptyState text="Аномалий цен нет. Все позиции в пределах ожидаемого диапазона." />
        ) : (
          <div className="flex flex-col gap-[12px]">
            {anomalies.map((item, i) => {
              const correcting = correctId === item.item_id;
              return (
              <div key={item.item_id} className="rounded-[16px] bg-white/[.025] border p-[18px] animate-fade-up" style={{ borderColor: "rgba(255,193,94,.25)", animationDelay: `${i * 35}ms` }}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="inline-flex items-center gap-[7px] mb-[6px] text-[11.5px] font-semibold px-[9px] py-[3px] rounded-md" style={{ background: "rgba(255,193,94,.14)", color: "#FFD37E" }}>
                      <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#FFC15E" }} />
                      Аномалия цены
                    </div>
                    <div className="text-[15px] font-semibold">{item.service_name_raw}</div>
                    <div className="text-[12.5px] text-ink/45 mt-[3px]">
                      {partnerName(item.partner_id)} · резидент {fmt(item.price_resident_kzt)} ₸ · нерезидент {fmt(item.price_nonresident_kzt)} ₸
                    </div>
                    {sourceName(item.doc_id) && (
                      <div className="inline-flex items-center gap-[6px] text-[11.5px] text-ink/40 mt-[5px]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4" /></svg>
                        источник: {sourceName(item.doc_id)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-[10px]">
                    <button
                      onClick={() => handleVerify(item, "confirm")}
                      className="px-[16px] py-[10px] rounded-[11px] text-[13.5px] font-semibold border transition-all"
                      style={{ background: "rgba(48,209,88,.12)", borderColor: "rgba(48,209,88,.3)", color: "#5BE892" }}
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => (correcting ? setCorrectId(null) : startCorrect(item))}
                      className="px-[16px] py-[10px] rounded-[11px] text-[13.5px] font-semibold border border-primary/30 bg-primary/[0.12] text-lav transition-all hover:bg-primary/20"
                    >
                      {correcting ? "Отмена" : "Исправить"}
                    </button>
                    <button
                      onClick={() => handleVerify(item, "reject")}
                      className="px-[16px] py-[10px] rounded-[11px] text-[13.5px] font-semibold border transition-all"
                      style={{ background: "rgba(255,95,87,.1)", borderColor: "rgba(255,95,87,.3)", color: "#FF8B85" }}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>

                {/* Инлайн-корректировка цены (оператор правит → дообучение) */}
                {correcting && (
                  <div className="mt-[14px] pt-[14px] border-t border-white/[0.06] flex flex-wrap items-end gap-3 animate-fade-up">
                    <label className="flex flex-col gap-[6px]">
                      <span className="text-[12px] text-ink/55 font-semibold">Резидент, ₸</span>
                      <input type="number" inputMode="numeric" value={correctForm.resident}
                        onChange={(e) => setCorrectForm({ ...correctForm, resident: e.target.value })}
                        className="w-[150px] bg-[#0E0E14] border border-white/10 rounded-[11px] px-[13px] py-[10px] text-[13.5px] text-ink outline-none focus:border-primary/50" />
                    </label>
                    <label className="flex flex-col gap-[6px]">
                      <span className="text-[12px] text-ink/55 font-semibold">Нерезидент, ₸</span>
                      <input type="number" inputMode="numeric" value={correctForm.nonResident}
                        onChange={(e) => setCorrectForm({ ...correctForm, nonResident: e.target.value })}
                        className="w-[150px] bg-[#0E0E14] border border-white/10 rounded-[11px] px-[13px] py-[10px] text-[13.5px] text-ink outline-none focus:border-primary/50" />
                    </label>
                    <button
                      onClick={() => handleCorrect(item)}
                      className="px-[18px] py-[10px] rounded-[11px] text-white text-[13.5px] font-semibold bg-brand shadow-brand transition-transform hover:-translate-y-[1px]"
                    >
                      Сохранить
                    </button>
                  </div>
                )}
              </div>
            );})}
          </div>
        )
      )}
    </section>
  );
}

function EmptyState({ text }) {
  return (
    <div className="p-[40px] text-center rounded-[18px] border border-white/[.06] bg-white/[.015]">
      <div className="grid place-items-center w-[54px] h-[54px] rounded-[15px] mx-auto mb-4 border" style={{ background: "rgba(48,209,88,.12)", borderColor: "rgba(48,209,88,.3)" }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
      </div>
      <div className="text-[14.5px] text-ink/55">{text}</div>
    </div>
  );
}
