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
    contact_email: partner.contact_email || null,
    contact_phone: partner.contact_phone || null,
  };
}
