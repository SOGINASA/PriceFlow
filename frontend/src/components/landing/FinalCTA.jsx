import { Link } from "react-router-dom";
import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// Финальный призыв к действию перед футером.
export default function FinalCTA() {
  const { t } = useI18n();
  const tr = t();
  const [ref, vis] = useReveal();

  return (
    <section className="px-6 pt-[50px] pb-[90px] max-w-[1200px] mx-auto">
      <div
        ref={ref}
        style={{ ...revealStyle(vis), background: "linear-gradient(135deg,rgba(94,92,230,.18),rgba(167,139,250,.1))", padding: "clamp(40px,7vw,80px) 24px" }}
        className="relative overflow-hidden rounded-[30px] border border-primary/30 text-center"
      >
        <div className="absolute pointer-events-none rounded-full" style={{ top: "-40%", left: "50%", width: 600, height: 600, marginLeft: -300, background: "radial-gradient(circle,rgba(94,92,230,.35),transparent 60%)", filter: "blur(60px)" }} />
        <div className="relative">
          <h2 className="font-display font-bold whitespace-pre-line" style={{ fontSize: "clamp(32px,5vw,56px)", letterSpacing: "-.03em", lineHeight: 1.05 }}>{tr.cta.title}</h2>
          <p className="mt-5 text-lg text-ink/70 max-w-[540px] mx-auto">{tr.cta.sub}</p>
          <div className="flex flex-wrap gap-[14px] justify-center mt-[34px]">
            <Link to="/login" className="text-base font-semibold px-8 py-4 rounded-[14px] bg-ink text-bg transition-transform hover:-translate-y-[2px]">{tr.cta.btn1}</Link>
            <a href="#how" className="text-base font-semibold px-[30px] py-4 rounded-[14px] text-ink border border-white/[.15] transition-transform hover:-translate-y-[2px]" style={{ background: "rgba(255,255,255,.06)" }}>{tr.cta.btn2}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
