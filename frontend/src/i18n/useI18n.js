import { create } from "zustand";
import { persist } from "zustand/middleware";
import { translations, LANGUAGES } from "./translations";

// ---------- Стор локализации лендинга ----------
// Хранит выбранный язык и отдаёт словарь переводов. Выбор сохраняется в
// localStorage, поэтому язык не сбрасывается при перезагрузке.
const useI18n = create(
  persist(
    (set, get) => ({
      lang: "ru",
      setLang: (lang) => LANGUAGES.includes(lang) && set({ lang }),
      // Текущий словарь переводов для выбранного языка.
      t: () => translations[get().lang],
    }),
    { name: "medpartners-lang" }
  )
);

export { LANGUAGES };
export default useI18n;
