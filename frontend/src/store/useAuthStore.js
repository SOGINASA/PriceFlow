import { create } from "zustand";
import { persist } from "zustand/middleware";

// ---------- Стор аутентификации ----------
// Хранит текущего пользователя и его роль (user | admin). Роль управляет
// доступом к админ-разделу. persist сохраняет сессию между перезагрузками.
// При интеграции с бэкендом методы login/register заменяются на вызовы API,
// которые возвращают токен и профиль пользователя.

const useAuthStore = create(
  persist(
    (set) => ({
      user: null, // { name, email, organization }
      role: "user", // "user" | "admin"
      isAuthenticated: false,

      // Демо-вход: помечаем сессию активной. TODO: заменить на authApi.login.
      login: (user = { name: "Алия Нурлан", email: "" }) =>
        set({ user, isAuthenticated: true }),

      // Регистрация с выбором роли.
      register: (user, role = "user") =>
        set({ user, role, isAuthenticated: true }),

      setRole: (role) => set({ role }),

      logout: () => set({ user: null, isAuthenticated: false, role: "user" }),
    }),
    { name: "medpartners-auth" }
  )
);

export default useAuthStore;
