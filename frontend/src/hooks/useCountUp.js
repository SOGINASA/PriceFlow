import { useEffect, useRef, useState } from "react";
import { formatNumber } from "../lib/format";

// ---------- Хук анимированного счётчика ----------
// Плавно прогоняет число от 0 до target при появлении элемента в зоне
// видимости (ease-out cubic). Используется в блоках статистики и отчётах.
export function useCountUp(target, { decimals = 0, separator = false, duration = 1600, start = true } = {}) {
  const ref = useRef(null);
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !start) return;

    const animate = () => {
      if (startedRef.current) return;
      startedRef.current = true;
      const t0 = performance.now();
      const tick = (now) => {
        const p = Math.min((now - t0) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValue(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && animate()),
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration, start]);

  const formatted = separator ? formatNumber(value, decimals) : value.toFixed(decimals);
  return [ref, formatted];
}
