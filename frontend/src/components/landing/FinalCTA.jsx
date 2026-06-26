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
        style={revealStyle(vis)}
        className="relative overflow-hidden rounded-[30px] border border-primary/30 text-center bg-brand-cta px-6 py-[clamp(40px,7vw,80px)]"
      >
        <div className="absolute pointer-events-none rounded-full -top-[40%] left-1/2 -ml-[300px] w-[600px] h-[600px] blur-[60px] bg-[radial-gradient(circle,rgba(94,92,230,.35),transparent_60%)]" />
        <div className="relative">
          <h2 className="font-display font-bold whitespace-pre-line text-[clamp(32px,5vw,56px)] tracking-[-.03em] leading-[1.05]">{tr.cta.title}</h2>
          <p className="mt-5 text-lg text-ink/70 max-w-[540px] mx-auto">{tr.cta.sub}</p>
          <div className="flex flex-wrap gap-[14px] justify-center mt-[34px]">
            <Link to="/login" className="text-base font-semibold px-8 py-4 rounded-[14px] bg-ink text-bg transition-transform hover:-translate-y-[2px]">{tr.cta.btn1}</Link>
            <a href="#how" className="text-base font-semibold px-[30px] py-4 rounded-[14px] text-ink border border-white/[0.15] transition-transform hover:-translate-y-[2px] bg-white/[0.06]">{tr.cta.btn2}</a>
          </div>
        </div>
      </div>
    </section>
  );
}
