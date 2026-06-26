import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Стор аутентификации ----------
// Хранит текущего пользователя, роль (user | operator | admin) и JWT.
// Роль управляет доступом к разделам (аналитика — admin, верификация —
// operator/admin). persist сохраняет сессию между перезагрузками.

const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { name, email }
      role: "user", // "user" | "operator" | "admin" | "partner"
      token: null, // JWT с бэкенда (см. POST /api/admin/login)
      partnerId: null, // id клиники, если вошли как партнёр
      isAuthenticated: false,

      // Реальная сессия после входа через API.
      setSession: ({ user, role = "user", token = null, partnerId = null }) =>
        set({ user, role, token, partnerId, isAuthenticated: true }),

      // Демо-вход (OAuth/биометрия — пока без бэкенда).
      login: (user = { name: "Алия Нурлан", email: "" }) =>
        set({ user, isAuthenticated: true }),

      // Регистрация с выбором роли.
      register: (user, role = "user") =>
        set({ user, role, isAuthenticated: true }),

      setRole: (role) => set({ role }),

      // Вход/переключение в роль партнёра (демо): привязываем к клинике.
      enterPartner: ({ partnerId, name }) =>
        set({ role: "partner", partnerId, user: { name, email: "" }, isAuthenticated: true }),

      logout: () => set({ user: null, isAuthenticated: false, role: "user", token: null, partnerId: null }),
    }),
    { name: "medpartners-auth" }
  )
);

export default useAuthStore;
