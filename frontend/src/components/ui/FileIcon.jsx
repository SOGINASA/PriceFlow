// ---------- Иконка файла по типу ----------
// Совпадает с типами из lib/format.fileTypeOf (pdf/xls/csv/img/doc/file).
const C = "#9DB0FF";

const PATHS = {
  pdf: <><path d="M7 3h7l4 4v14H7z" stroke={C} strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3v4h4" stroke={C} strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 14h5M10 17h3" stroke={C} strokeWidth="1.5" strokeLinecap="round" /></>,
  xls: <><rect x="4" y="5" width="16" height="14" rx="2.5" stroke={C} strokeWidth="1.6" /><path d="M4 9.8h16M4 14.3h16M10.5 5v14M15.5 5v14" stroke={C} strokeWidth="1.1" opacity=".7" /></>,
  csv: <><rect x="4" y="5" width="16" height="14" rx="2.5" stroke={C} strokeWidth="1.6" /><path d="M7.3 9h9.4M7.3 12h9.4M7.3 15h6" stroke={C} strokeWidth="1.4" strokeLinecap="round" /></>,
  img: <><rect x="4" y="5" width="16" height="14" rx="2.5" stroke={C} strokeWidth="1.6" /><circle cx="9" cy="10" r="1.6" fill={C} /><path d="m5 17 4.4-3.7 3.4 2.5 2.8-2.2L19 16.3" stroke={C} strokeWidth="1.5" strokeLinejoin="round" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" stroke={C} strokeWidth="1.6" strokeLinejoin="round" /><path d="M14 3v4h4" stroke={C} strokeWidth="1.6" strokeLinejoin="round" /><path d="M10 12h5M10 15h3" stroke={C} strokeWidth="1.4" strokeLinecap="round" /></>,
  zip: <><path d="M6 3h9l3 3v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke={C} strokeWidth="1.6" strokeLinejoin="round" /><path d="M11 3v2h1.5M11 6.5h1.5M11 9h1.5M11 11.5h1.5" stroke={C} strokeWidth="1.4" strokeLinecap="round" /><rect x="10.5" y="13" width="3" height="3.5" rx="0.6" stroke={C} strokeWidth="1.3" /></>,
  file: <path d="M7 3h7l4 4v14H7z" stroke={C} strokeWidth="1.6" strokeLinejoin="round" />,
};

export default function FileIcon({ type, size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {PATHS[type] || PATHS.file}
    </svg>
  );
}
