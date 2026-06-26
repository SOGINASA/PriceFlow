// ---------- Логотип MedPartners ----------
// Градиентный квадрат с «галочкой-графиком» + опциональная подпись.
// size управляет размером значка, showText — показывать ли слово MedPartners.
export default function Logo({ size = 30, showText = true, textSize = 18 }) {
  const radius = Math.round(size * 0.3);
  return (
    <span className="flex items-center gap-[11px]">
      <span
        className="grid place-items-center bg-brand shadow-brand-glow"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        <svg width={size * 0.53} height={size * 0.53} viewBox="0 0 16 16" fill="none">
          <path d="M2 11.5 6 6l3 3 5-6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      {showText && (
        <span className="font-display font-bold tracking-[-.02em]" style={{ fontSize: textSize }}>
          MedPartners
        </span>
      )}
    </span>
  );
}
