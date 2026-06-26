// ---------- Маппинг партнёра бэкенда в визуальную карточку ----------
// Бэкенд возвращает Partner { partner_id, name, city, ... }, а UI-компоненты
// (ClinicSearch, PartnerPage) ожидают карточку с инициалом и градиентом.
// Здесь детерминированно достраиваем визуальные поля по данным партнёра.

const GRADIENTS = [
  "linear-gradient(135deg,#6E8BFF,#5E5CE6)",
  "linear-gradient(135deg,#A78BFA,#5E5CE6)",
  "linear-gradient(135deg,#6E8BFF,#A78BFA)",
  "linear-gradient(135deg,#5E5CE6,#7E7BFF)",
];

// Стабильный индекс градиента по строке (чтобы у клиники всегда был один цвет).
function hashIndex(str, mod) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h % mod;
}

function formatFrom(value) {
  if (value == null) return "—";
  return Math.round(value).toLocaleString("ru-RU").replace(/,/g, " ");
}

// partner — объект из API; from — минимальная цена (опционально).
export function toClinicCard(partner, { from } = {}) {
  const id = partner.partner_id || partner.id;
  const name = partner.name || "Без названия";
  const metaParts = [partner.city, partner.address].filter(Boolean);
  return {
    id,
    name,
    city: partner.city || "",
    meta: metaParts.join(" · ") || "Клиника-партнёр",
    from: from != null ? formatFrom(from) : null,
    initial: name.replace(/[«"'»]/g, "").trim().charAt(0).toUpperCase() || "?",
    gradient: GRADIENTS[hashIndex(String(id), GRADIENTS.length)],
    address: partner.address || "",
    description: partner.description || "",
    // алиасы для форм/страниц кабинета
    phone: partner.contact_phone || "",
    email: partner.contact_email || "",
    contact_email: partner.contact_email || null,
    contact_phone: partner.contact_phone || null,
  };
}

// ---------- Маппинг позиции прайса (PriceItem) в элемент UI ----------
// Бэкенд: { item_id, service_name_raw, service_name, category, price_*_kzt,
// effective_date, history:[{price_*_kzt, effective_date}] }.
export function toServiceItem(s) {
  return {
    id: s.item_id,
    name: s.service_name || s.service_name_raw,
    rawName: s.service_name_raw,
    category: s.category || "—",
    resident: s.price_resident_kzt ?? 0,
    nonResident: s.price_nonresident_kzt ?? 0,
    effectiveDate: s.effective_date,
    history: (s.history || []).map((h) => ({
      resident: h.price_resident_kzt ?? 0,
      nonResident: h.price_nonresident_kzt ?? 0,
      date: h.effective_date,
    })),
  };
}
