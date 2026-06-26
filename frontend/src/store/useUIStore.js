import { create } from "zustand";

// ---------- UI-состояние оболочки ----------
// Управляет мобильным профиль-меню (bottom sheet) и уведомлениями (лента +
// счётчик непрочитанных для бейджа на колокольчике). Уведомления собираются
// из реальных данных бэкенда (см. lib/notifications.js, AppLayout).
const useUIStore = create((set) => ({
  profileOpen: false,
  openProfile: () => set({ profileOpen: true }),
  closeProfile: () => set({ profileOpen: false }),

  notifications: [],       // лента уведомлений (из реальных данных)
  unreadCount: 0,          // число непрочитанных (бейдж)
  notificationsViewed: false, // пользователь открывал ленту в этой сессии

  // Загрузка ленты: если её уже просмотрели — бейдж остаётся погашенным.
  setNotifications: (items) =>
    set((state) => ({
      notifications: items,
      unreadCount: state.notificationsViewed ? 0 : items.filter((n) => n.unread).length,
    })),

  // Открыли страницу уведомлений → гасим бейдж.
  markAllRead: () => set({ unreadCount: 0, notificationsViewed: true }),
}));

export default useUIStore;
