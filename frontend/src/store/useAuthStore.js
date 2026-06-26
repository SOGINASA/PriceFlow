import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Стор аутентификации ----------
// Хранит текущего пользователя, роль (operator | admin) и JWT, полученный
// от реального бэкенда (POST /api/admin/login). Роль управляет доступом к
// разделам (аналитика — admin, верификация — operator/admin).
// persist сохраняет сессию между перезагрузками.

const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { name, email }
      role: "user", // "user" | "operator" | "admin"
      token: null, // JWT с бэкенда (см. POST /api/admin/login)
      isAuthenticated: false,

      // Реальная сессия после входа через API.
      setSession: ({ user, role = "user", token = null }) =>
        set({ user, role, token, isAuthenticated: true }),

      setRole: (role) => set({ role }),

      logout: () => set({ user: null, isAuthenticated: false, role: "user", token: null }),
    }),
    { name: "medpartners-auth" }
  )
);

export default useAuthStore;
