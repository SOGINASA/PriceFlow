import { useEffect, useRef, useState } from "react";

// ---------- Хук появления при скролле ----------
// Возвращает ref и флаг visible. Когда элемент попадает в зону видимости,
// visible становится true (один раз) — на этом строится плавное появление
// секций лендинга (opacity + translateY + blur), как в исходном дизайне.
export function useReveal({ threshold = 0.12, rootMargin = "0px 0px -8% 0px" } = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true);
            io.unobserve(e.target);
          }
        });
      },
      { threshold, rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold, rootMargin]);

  return [ref, visible];
}

// Готовый набор стилей для reveal-эффекта с настраиваемой задержкой.
export function revealStyle(visible, delay = 0) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible ? "none" : "translateY(30px)",
    filter: visible ? "none" : "blur(8px)",
    transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}ms, transform 1s cubic-bezier(.16,1,.3,1) ${delay}ms, filter .9s ease ${delay}ms`,
    willChange: "opacity, transform, filter",
  };
}
