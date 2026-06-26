import useI18n from "../../i18n/useI18n";

// Поддерживаемые форматы (бегущая строка). Иконки — простые inline-SVG.
const FORMATS = [
  { label: "PDF-прайс", icon: <path d="M7 3h7l4 4v14H7z M14 3v4h4 M10 14h5 M10 17h3" /> },
  { label: "Excel / XLSX", icon: <><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M4 9.8h16M4 14.3h16M10.5 5v14M15.5 5v14" /></> },
  { label: "CSV-таблица", icon: <><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="M7.3 9h9.4M7.3 12h9.4M7.3 15h6" /></> },
  { label: "Фото и сканы", icon: <><rect x="4" y="5" width="16" height="14" rx="2.5" /><path d="m5 17 4.4-3.7 3.4 2.5 2.8-2.2L19 16.3" /></> },
  { label: "Веб-страницы", icon: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16" /></> },
  { label: "ZIP-архивы", icon: <path d="M4 7.5A2 2 0 0 1 6 5.5h3.3l2.4 1.6H18a2 2 0 0 1 2 2v7.4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /> },
  { label: "DOCX / RTF", icon: <path d="M7 3h7l4 4v14H7z M14 3v4h4 M10 11.5h5M10 14h5M10 16.5h3" /> },
];

function Pill({ label, icon }) {
  return (
    <span className="inline-flex items-center gap-[9px] px-[19px] py-[11px] rounded-xl bg-white/[.04] border border-white/[.07] text-sm font-semibold text-ink/70 whitespace-nowrap">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      {label}
    </span>
  );
}

export default function TrustMarquee() {
  const { t } = useI18n();
  const tr = t();
  return (
    <section className="pt-[10px] pb-[50px] relative z-[2]">
      <div className="text-center text-[12.5px] tracking-[.14em] uppercase text-ink/30 mb-[26px]">{tr.trust.label}</div>
      {/* Маска по краям + бесконечная прокрутка (дублируем список) */}
      <div className="relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)] [-webkit-mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex gap-[18px] w-max animate-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex gap-[18px]" aria-hidden={dup === 1}>
              {FORMATS.map((f, i) => (
                <Pill key={i} {...f} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
