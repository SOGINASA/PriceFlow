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

// Русское склонение по числу: plural(2, ['услуга','услуги','услуг']) -> "услуги".
function plural(n, [one, few, many]) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
  return many;
}

// partner — объект из API (с services_count / min_price_kzt от бэкенда);
// from — явная минимальная цена (имеет приоритет над partner.min_price_kzt).
export function toClinicCard(partner, { from } = {}) {
  const id = partner.partner_id || partner.id;
  const name = partner.name || "Без названия";
  const count = partner.services_count;
  const fromValue = from != null ? from : partner.min_price_kzt;

  const metaParts = [partner.city, partner.address].filter(Boolean);
  if (count) metaParts.push(`${count} ${plural(count, ["услуга", "услуги", "услуг"])}`);

  return {
    id,
    name,
    city: partner.city || "",
    meta: metaParts.join(" · ") || "Клиника-партнёр",
    from: fromValue != null ? formatFrom(fromValue) : null,
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
