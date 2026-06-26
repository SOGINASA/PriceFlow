import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CLINICS, REPORT_ROWS } from "../data/mock";

// ---------- Стор данных партнёров (клиник) ----------
// Источник правды для прайсов клиник на фронте: партнёр редактирует свой
// прайс здесь, а публичная страница клиники читает те же данные. У каждой
// позиции есть текущая цена + дата вступления в силу и ИСТОРИЯ предыдущих
// цен с датами — она видна всем пользователям (требование: «когда какая цена
// была и изменения по ней видно всем»).
//
// При появлении бэкенда действия заменяются вызовами partnerSelfApi
// (см. src/api/index.js), а сид — загрузкой с сервера.

let seq = 0;
const uid = () => `svc_${Date.now().toString(36)}_${++seq}`;

// "14 900" → 14900
const num = (s) => Number(String(s).replace(/\s/g, "")) || 0;

// Дата ISO (YYYY-MM-DD)
const iso = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Множители цен для клиник, которых нет в колонках REPORT_ROWS.
const COLUMN = { alpha: "alpha", city: "city", health: "health" };
const FACTOR = { mediker: 1.18, sunqar: 0.82 };

// Сид прайса одной клиники из демо-данных + одна историческая запись,
// чтобы таймлайн изменения цены был наглядным.
function seedServices(clinicId) {
  const col = COLUMN[clinicId];
  const factor = FACTOR[clinicId] || 1;
  return REPORT_ROWS.map((r) => {
    const base = col ? num(r[col]) : Math.round((num(r.alpha) * factor) / 100) * 100;
    const nonRes = Math.round((base * 1.15) / 100) * 100;
    // Прошлая цена (≈6 мес назад) — была ниже на ~8%.
    const oldRes = Math.round((base * 0.92) / 100) * 100;
    const oldNon = Math.round((oldRes * 1.15) / 100) * 100;
    return {
      id: uid(),
      name: r.service,
      category: "диагностика",
      resident: base,
      nonResident: nonRes,
      effectiveDate: iso(2026, 6, 1),
      // history — предыдущие версии (старые → к новым). Текущая хранится выше.
      history: [{ resident: oldRes, nonResident: oldNon, date: iso(2025, 12, 1) }],
    };
  });
}

// Профиль клиники для редактирования (расширяет карточку из mock).
function seedClinic(c) {
  return {
    id: c.id,
    name: c.name,
    city: c.city,
    address: `${c.city}, ул. Абая, 12`,
    phone: "+7 (727) 350-12-00",
    email: `info@${c.id}.kz`,
    description: c.meta,
    initial: c.initial,
    gradient: c.gradient,
  };
}

const seedClinics = () => Object.fromEntries(CLINICS.map((c) => [c.id, seedClinic(c)]));
const seedPrices = () => Object.fromEntries(CLINICS.map((c) => [c.id, seedServices(c.id)]));

const usePartnerStore = create(
  persist(
    (set, get) => ({
      clinics: seedClinics(), // { [id]: profile }
      prices: seedPrices(), // { [id]: serviceItem[] }

      // --- чтение ---
      getClinic: (id) => get().clinics[id],
      getServices: (id) => get().prices[id] || [],

      // --- профиль клиники ---
      updateClinic: (id, patch) =>
        set((s) => ({ clinics: { ...s.clinics, [id]: { ...s.clinics[id], ...patch } } })),

      // --- добавить услугу/препарат ---
      addService: (clinicId, { name, category, resident, nonResident, effectiveDate }) =>
        set((s) => {
          const item = {
            id: uid(),
            name: name.trim(),
            category: category || "—",
            resident: Number(resident) || 0,
            nonResident: Number(nonResident) || 0,
            effectiveDate: effectiveDate || iso(2026, 6, 26),
            history: [],
          };
          return { prices: { ...s.prices, [clinicId]: [item, ...(s.prices[clinicId] || [])] } };
        }),

      // --- изменить цену (старая уходит в историю с её датой) ---
      updatePrice: (clinicId, itemId, { resident, nonResident, effectiveDate }) =>
        set((s) => {
          const list = (s.prices[clinicId] || []).map((it) => {
            if (it.id !== itemId) return it;
            const priceChanged =
              Number(resident) !== it.resident || Number(nonResident) !== it.nonResident;
            return {
              ...it,
              // архивируем прежнюю цену в историю только если она реально изменилась
              history: priceChanged
                ? [...it.history, { resident: it.resident, nonResident: it.nonResident, date: it.effectiveDate }]
                : it.history,
              resident: Number(resident) || 0,
              nonResident: Number(nonResident) || 0,
              effectiveDate: effectiveDate || it.effectiveDate,
            };
          });
          return { prices: { ...s.prices, [clinicId]: list } };
        }),

      // --- редактировать название/категорию услуги ---
      updateService: (clinicId, itemId, patch) =>
        set((s) => ({
          prices: {
            ...s.prices,
            [clinicId]: (s.prices[clinicId] || []).map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
          },
        })),

      // --- удалить услугу ---
      removeService: (clinicId, itemId) =>
        set((s) => ({
          prices: { ...s.prices, [clinicId]: (s.prices[clinicId] || []).filter((it) => it.id !== itemId) },
        })),
    }),
    { name: "medpartners-partner-data", version: 1 }
  )
);

export default usePartnerStore;
