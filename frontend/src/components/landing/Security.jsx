import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";

// ---------- Секция «Безопасный вход» (биометрия + OAuth) ----------
export default function Security() {
  const { t } = useI18n();
  const tr = t();
  const [headRef, headVis] = useReveal();
  const [fpRef, fpVis] = useReveal();
  const [faceRef, faceVis] = useReveal();

  return (
    <section id="security" className="px-6 pt-[70px] pb-20 max-w-[1100px] mx-auto">
      <div ref={headRef} style={revealStyle(headVis)} className="text-center max-w-[640px] mx-auto mb-[46px]">
        <div className="text-[13px] font-bold tracking-[.06em] uppercase" style={{ color: "#8B88FF" }}>{tr.bio.eyebrow}</div>
        <h2 className="font-display font-bold mt-[14px]" style={{ fontSize: "clamp(28px,4vw,42px)", letterSpacing: "-.03em" }}>{tr.bio.title}</h2>
        <p className="mt-4 text-base leading-[1.6] text-ink/60">{tr.bio.sub}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-[18px]">
        {/* Отпечаток пальца */}
        <div
          ref={fpRef}
          style={{ ...revealStyle(fpVis), background: "linear-gradient(180deg,rgba(20,20,28,.7),rgba(12,12,18,.7))" }}
          className="relative overflow-hidden rounded-[22px] border border-white/[.08] p-9 flex flex-col items-center text-center"
        >
          <div className="absolute pointer-events-none rounded-full" style={{ top: "-20%", left: "50%", width: 300, height: 300, marginLeft: -150, background: "radial-gradient(circle,rgba(94,92,230,.25),transparent 65%)", filter: "blur(40px)" }} />
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="relative">
            <g stroke="#7E7BFF" strokeWidth="2.2" strokeLinecap="round" fill="none">
              <path d="M60 28c-17 0-31 14-31 31v14" />
              <path d="M91 73V59c0-17-14-31-31-31" />
              <path d="M42 78V59a18 18 0 0 1 36 0v22" opacity=".85" />
              <path d="M53 84V59a7 7 0 0 1 14 0v26" opacity=".7" />
              <path d="M60 59v28" opacity=".55" />
            </g>
          </svg>
          <h3 className="font-display font-semibold text-xl mt-[22px]">{tr.bio.fpT}</h3>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-ink/50 max-w-[300px]">{tr.bio.fpD}</p>
          <div className="mt-[18px] inline-flex items-center gap-2 px-[15px] py-2 rounded-[10px] text-[13px] font-semibold border" style={{ background: "rgba(48,209,88,.12)", borderColor: "rgba(48,209,88,.3)", color: "#5BE892" }}>
            <span className="w-[7px] h-[7px] rounded-full" style={{ background: "#30D158", boxShadow: "0 0 8px #30D158" }} />
            {tr.bio.fpBadge}
          </div>
        </div>

        {/* Скан лица */}
        <div
          ref={faceRef}
          style={{ ...revealStyle(faceVis, 100), background: "linear-gradient(180deg,rgba(20,20,28,.7),rgba(12,12,18,.7))" }}
          className="relative overflow-hidden rounded-[22px] border border-white/[.08] p-9 flex flex-col items-center text-center"
        >
          <div className="absolute pointer-events-none rounded-full" style={{ top: "-20%", left: "50%", width: 300, height: 300, marginLeft: -150, background: "radial-gradient(circle,rgba(167,139,250,.22),transparent 65%)", filter: "blur(40px)" }} />
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none" className="relative">
            <g stroke="#A78BFA" strokeWidth="2.4" strokeLinecap="round" fill="none">
              <path d="M30 44V36a6 6 0 0 1 6-6h8" />
              <path d="M76 30h8a6 6 0 0 1 6 6v8" />
              <path d="M90 76v8a6 6 0 0 1-6 6h-8" />
              <path d="M44 90h-8a6 6 0 0 1-6-6v-8" />
            </g>
            <g stroke="#C9D0FF" strokeWidth="2" strokeLinecap="round" fill="none" opacity=".85">
              <circle cx="50" cy="54" r="2.4" fill="#C9D0FF" stroke="none" />
              <circle cx="70" cy="54" r="2.4" fill="#C9D0FF" stroke="none" />
              <path d="M60 56v9" />
              <path d="M52 72c3 3 13 3 16 0" />
            </g>
          </svg>
          <h3 className="font-display font-semibold text-xl mt-[22px]">{tr.bio.faceT}</h3>
          <p className="mt-2 text-[14.5px] leading-[1.55] text-ink/50 max-w-[300px]">{tr.bio.faceD}</p>
          <div className="mt-[18px] flex gap-[10px]">
            <span className="inline-flex items-center gap-2 px-[14px] py-[9px] rounded-[10px] bg-white/5 border border-white/10 text-[13px] font-semibold">G · OAuth</span>
            <span className="inline-flex items-center gap-2 px-[14px] py-[9px] rounded-[10px] bg-white/5 border border-white/10 text-[13px] font-semibold"> · Apple</span>
          </div>
        </div>
      </div>
    </section>
  );
}
