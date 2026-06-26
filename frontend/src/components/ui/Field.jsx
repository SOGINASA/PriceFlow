import { useState } from "react";

// ---------- Поле ввода с подписью и фокус-обводкой ----------
// Повторяет стиль инпутов из дизайна (фокус: фиолетовая рамка + glow).
export default function Field({ label, type = "text", placeholder, value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <label className="flex flex-col gap-[7px]">
      <span className="text-[12.5px] font-semibold text-ink/60">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="w-full px-[15px] py-[13px] rounded-xl text-ink text-[15px] outline-none transition-all border"
        style={{
          background: "rgba(12,12,18,.7)",
          borderColor: focused ? "rgba(94,92,230,.6)" : "rgba(255,255,255,.1)",
          boxShadow: focused ? "0 0 0 4px rgba(94,92,230,.12)" : "none",
        }}
      />
    </label>
  );
}
