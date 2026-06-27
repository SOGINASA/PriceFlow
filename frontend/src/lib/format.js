// ---------- Форматтеры данных, единые для всего приложения ----------

// Число с разделителем разрядов в стиле дизайна: 4218 -> "4 218".
export function formatNumber(value, decimals = 0) {
  const fixed = decimals > 0 ? Number(value).toFixed(decimals) : String(Math.round(value));
  const [intPart, decPart] = fixed.split(".");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return decPart ? `${grouped}.${decPart}` : grouped;
}

// Цена в тенге: 14900 -> "14 900 ₸". Принимает число или уже готовую строку.
export function formatPrice(value, currency = "₸") {
  const num = typeof value === "string" ? Number(value.replace(/\s/g, "")) : value;
  if (Number.isNaN(num)) return `${value} ${currency}`;
  return `${formatNumber(num)} ${currency}`;
}

// Человекочитаемый размер файла: 2516582 -> "2.4 МБ".
export function formatFileSize(bytes) {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} МБ`;
  if (bytes > 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${bytes} Б`;
}

// Дата ISO (YYYY-MM-DD) → "01.06.2026". Пустое → "—".
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// Определение типа файла по расширению (для иконок и парсера на бэке).
export function fileTypeOf(name) {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "pdf";
  if (n.endsWith(".csv")) return "csv";
  if (/\.(xlsx|xls)$/.test(n)) return "xls";
  if (/\.(png|jpg|jpeg|tif|tiff|bmp)$/.test(n)) return "img";
  if (/\.(docx|rtf)$/.test(n)) return "doc";
  if (n.endsWith(".zip")) return "zip";
  return "file";
}
