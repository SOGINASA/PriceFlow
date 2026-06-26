import { useNavigate } from "react-router-dom";
import useI18n from "../../i18n/useI18n";
import { useReveal, revealStyle } from "../../hooks/useReveal";
import ClinicSearch from "../shared/ClinicSearch";

// Секция поиска клиник на лендинге. Клик по клинике ведёт на вход (демо).
export default function ClinicSearchSection() {
  const { t } = useI18n();
  const tr = t();
  const navigate = useNavigate();
  const [headRef, headVis] = useReveal();
  const [boxRef, boxVis] = useReveal();

  return (
    <section id="search" className="px-6 pt-[70px] pb-20 max-w-[1000px] mx-auto">
      <div ref={headRef} style={revealStyle(headVis)} className="text-center max-w-[640px] mx-auto mb-9">
        <div className="text-[13px] font-bold tracking-[.06em] uppercase text-[#8B88FF]">{tr.search.eyebrow}</div>
        <h2 className="font-display font-bold mt-[14px] text-[clamp(28px,4vw,42px)] tracking-[-.03em]">{tr.search.title}</h2>
      </div>
      <div ref={boxRef} style={revealStyle(boxVis)} className="rounded-3xl bg-white/[0.03] border border-white/[0.08] p-[18px]">
        <ClinicSearch
          placeholder={tr.search.placeholder}
          noneText={tr.search.none}
          onSelect={() => navigate("/login")}
        />
      </div>
    </section>
  );
}
