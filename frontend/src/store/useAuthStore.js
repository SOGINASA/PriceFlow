import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Стор аутентификации ----------
// Хранит текущего пользователя, роль (admin | partner) и JWT, полученный
// от реального бэкенда (POST /api/admin/login). Роль управляет доступом к
// разделам (аналитика и верификация — admin, кабинет клиники — partner).
// persist сохраняет сессию между перезагрузками.

const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { name, email }
      role: "user", // "user" | "admin" | "partner"
      token: null, // JWT с бэкенда (см. POST /api/admin/login)
      partnerId: null, // id клиники, если вошли как партнёр
      isAuthenticated: false,

      // Реальная сессия после входа через API.
      setSession: ({ user, role = "user", token = null, partnerId = null }) =>
        set({ user, role, token, partnerId, isAuthenticated: true }),

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
