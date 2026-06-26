import { create } from "zustand";

// ---------- UI-состояние оболочки ----------
// Управляет мобильным профиль-меню (bottom sheet) и счётчиком непрочитанных
// уведомлений (для бейджа на иконке-колокольчике).
const useUIStore = create((set) => ({
  profileOpen: false,
  openProfile: () => set({ profileOpen: true }),
  closeProfile: () => set({ profileOpen: false }),

  unreadCount: 2, // демо: число непрочитанных уведомлений
  markAllRead: () => set({ unreadCount: 0 }),
}));

export default useUIStore;
