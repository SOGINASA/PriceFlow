import { create } from "zustand";

// Базовый Zustand store для проекта PriceFlow.
// Расширяй его срезами (slices) по мере роста приложения.
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));

export default useStore;
