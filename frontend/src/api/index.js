// ---------- Единая точка доступа к API ----------
// Методы 1:1 повторяют REST-эндпоинты из ТЗ (раздел 4.5), чтобы при появлении
// бэкенда достаточно было заменить mock-данные в страницах на эти вызовы.
import { api } from "./client";

// --- Справочник услуг ---
export const servicesApi = {
  // GET /services — список услуг справочника с фильтрацией по категории
  list: (params) => api.get("/services", { params }),
  // GET /services/{id}/partners — кто оказывает услугу и по какой цене
  partners: (serviceId) => api.get(`/services/${serviceId}/partners`),
};

// --- Партнёры (клиники) ---
export const partnersApi = {
  // GET /partners — фильтрация по городу/статусу
  list: (params) => api.get("/partners", { params }),
  // GET /partners/{id}/services — весь прайс конкретной клиники
  services: (partnerId) => api.get(`/partners/${partnerId}/services`),
};

// --- Поиск ---
export const searchApi = {
  // GET /search?q= — полнотекстовый поиск по услугам и партнёрам
  query: (q) => api.get("/search", { params: { q } }),
};

// --- Документы / обработка архива ---
export const documentsApi = {
  // POST /documents/upload — приём архива/файлов (FormData)
  upload: (formData) => api.post("/documents/upload", formData),
  // GET /documents/{id} — статус обработки документа
  status: (docId) => api.get(`/documents/${docId}`),
};

// --- Очередь сопоставления (для операторов) ---
export const matchingApi = {
  // GET /unmatched — несопоставленные позиции
  unmatched: () => api.get("/unmatched"),
  // POST /match — ручное сопоставление позиции со справочником
  match: (payload) => api.post("/match", payload),
};
