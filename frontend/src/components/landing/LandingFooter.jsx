import Logo from "../ui/Logo";
import useI18n from "../../i18n/useI18n";

export default function LandingFooter() {
  const { t } = useI18n();
  const tr = t();
  return (
    <footer className="border-t border-white/[.07] px-6 py-[46px] max-w-[1200px] mx-auto flex flex-wrap gap-6 items-center justify-between">
      <Logo size={28} textSize={16} />
      <div className="text-[13.5px] text-ink/40 text-center">{tr.footer.tag}</div>
      <div className="text-[13px] text-ink/30">{tr.footer.copy}</div>
    </footer>
  );
}
