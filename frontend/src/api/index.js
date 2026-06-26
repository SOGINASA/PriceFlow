// ---------- Единая точка доступа к API ----------
// Методы 1:1 соответствуют REST-эндпоинтам бэкенда MedArchive (см. /api/docs).
import { api } from "./client";

// --- Целевой справочник услуг (ТЗ 2.2 / 4.3) ---
export const catalogApi = {
  // POST /catalog/import — загрузка справочника (JSON-массив или XLSX FormData)
  import: (payload) => api.post("/catalog/import", payload),
};

// --- Справочник услуг (ТЗ 4.5) ---
export const servicesApi = {
  // GET /services?category= — список услуг справочника
  list: (params) => api.get("/services", { params }),
  // GET /services/{id}/partners — кто оказывает услугу и по какой цене
  partners: (serviceId) => api.get(`/services/${serviceId}/partners`),
};

// --- Партнёры (клиники) ---
export const partnersApi = {
  // GET /partners?city=&is_active= — список с фильтрацией
  list: (params) => api.get("/partners", { params }),
  // GET /partners/{id} — карточка партнёра (контакты)
  get: (partnerId) => api.get(`/partners/${partnerId}`),
  // GET /partners/{id}/services — весь прайс клиники
  services: (partnerId) => api.get(`/partners/${partnerId}/services`),
};

// --- Поиск ---
export const searchApi = {
  // GET /search?q= — полнотекстовый поиск по услугам и партнёрам
  query: (q) => api.get("/search", { params: { q } }),
};

// --- Загрузка и обработка прайсов (ТЗ 4.1) ---
export const archivesApi = {
  // POST /archives — ZIP (поле file) или отдельные файлы (поле files). sync=1 — синхронно.
  upload: (formData, { sync = false } = {}) =>
    api.post(`/archives${sync ? "?sync=1" : ""}`, formData),
  // GET /archives?status= — список документов
  list: (params) => api.get("/archives", { params }),
  // GET /archives/{id} — статус обработки документа
  status: (docId) => api.get(`/archives/${docId}`),
};

// --- Очереди верификации (для операторов, ТЗ 4.3 / 4.4) ---
export const reviewApi = {
  // GET /unmatched — несопоставленные позиции (+ подсказка)
  unmatched: () => api.get("/unmatched"),
  // GET /needs-review — позиции с аномалиями
  needsReview: () => api.get("/needs-review"),
  // POST /match — ручное сопоставление позиции со справочником
  match: (payload) => api.post("/match", payload),
  // POST /verify — подтвердить/отклонить/скорректировать позицию
  verify: (payload) => api.post("/verify", payload),
};

// --- Дашборд метрик (ТЗ 4.6) ---
export const dashboardApi = {
  // GET /dashboard/stats — кол-во документов, % нормализации, очереди
  stats: () => api.get("/dashboard/stats"),
};

// --- Аутентификация оператора ---
export const adminApi = {
  // POST /admin/login — { username, password } → { access_token }
  login: (payload) => api.post("/admin/login", payload),
};
