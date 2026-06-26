import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// Иконки шести возможностей (порядок совпадает с translations.features.items).
const ICONS = [
  <><rect x="5" y="3" width="14" height="18" rx="2.5" /><path d="M8.5 8h7M8.5 12h7M8.5 16h4" /></>,
  <path d="M12 3l1.8 4.4L18 9l-4.2 1.6L12 15l-1.8-4.4L6 9l4.2-1.6L12 3Z" />,
  <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  <path d="M12 4v10m0 0-3.5-3.5M12 14l3.5-3.5M5 18h14" />,
  <path d="M12 21s-7-4.3-7-9.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 7 3.5C19 16.7 12 21 12 21Z" />,
  <><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>,
];

function FeatureCard({ icon, title, desc, delay }) {
  const [ref, vis] = useReveal();
  return (
    <div
      ref={ref}
      style={revealStyle(vis, delay)}
      className="group relative p-[34px] px-[30px] rounded-[22px] border border-white/[0.07] transition-all duration-300 hover:-translate-y-1 hover:border-primary/45 bg-feature-card"
    >
      <div className="text-lav mb-6 drop-shadow-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <h3 className="font-display font-semibold text-xl tracking-[-.01em]">{title}</h3>
      <p className="mt-[10px] text-[15px] leading-[1.55] text-ink/55">{desc}</p>
    </div>
  );
}

export default function Features() {
  const { t } = useI18n();
  const tr = t();
  const [headRef, headVis] = useReveal();
  return (
    <section id="features" className="px-6 pt-[70px] pb-20 max-w-[1200px] mx-auto">
      <div ref={headRef} style={revealStyle(headVis)} className="max-w-[680px] mx-auto mb-[50px] text-center">
        <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#8B88FF]">{tr.features.eyebrow}</div>
        <h2 className="font-display font-bold mt-[14px] whitespace-pre-line text-[clamp(30px,4.5vw,46px)] tracking-[-.03em] leading-[1.08]">{tr.features.title}</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-[18px]">
        {tr.features.items.map((f, i) => (
          <FeatureCard key={i} icon={ICONS[i]} title={f.t} desc={f.d} delay={(i % 3) * 80} />
        ))}
      </div>
    </section>
  );
}
