// ---------- Базовый HTTP-клиент ----------
// Все запросы к бэкенду идут через эту обёртку. Базовый URL берётся из
// переменной окружения REACT_APP_API_URL (см. .env.example), что позволяет
// подключить реальный бэкенд без правки кода компонентов.

const BASE_URL = process.env.REACT_APP_API_URL || "/api";

async function request(path, { method = "GET", body, params, headers } = {}) {
  // Сборка query-строки из объекта params (?city=...&q=...)
  const query = params
    ? "?" + new URLSearchParams(Object.entries(params).filter(([, v]) => v != null)).toString()
    : "";

  const isFormData = body instanceof FormData;
  const res = await fetch(`${BASE_URL}${path}${query}`, {
    method,
    headers: {
      // FormData (загрузка файлов) сериализуется браузером сам — заголовок не ставим
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...headers,
    },
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const message = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${message}`);
  }
  // Пустой ответ (204) возвращаем как null
  return res.status === 204 ? null : res.json();
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => request(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => request(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => request(path, { ...opts, method: "DELETE" }),
};

export { BASE_URL };
