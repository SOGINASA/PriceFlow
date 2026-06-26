import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUploadStore from "../../store/useUploadStore";
import { DEMO_FILES } from "../../data/mock";
import { formatFileSize, fileTypeOf } from "../../lib/format";
import FileIcon from "../../components/ui/FileIcon";

export default function UploadPage() {
  const navigate = useNavigate();
  const { files, addFiles, removeFile } = useUploadStore();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  // Преобразуем нативные File в нашу структуру очереди.
  const mapFiles = (list) =>
    Array.from(list).map((f) => ({ name: f.name, size: formatFileSize(f.size), type: fileTypeOf(f.name) }));

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    addFiles(dropped.length ? mapFiles(dropped) : DEMO_FILES);
  };

  return (
    <section className="flex flex-col gap-[22px] animate-fade-up">
      {/* ---------- Зона перетаскивания ---------- */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className="relative rounded-3xl text-center cursor-pointer transition-all p-[54px] px-[30px]"
        style={{
          border: `1.6px dashed ${dragOver ? "rgba(94,92,230,.9)" : "rgba(94,92,230,.4)"}`,
          background: dragOver ? "rgba(94,92,230,.12)" : "rgba(94,92,230,.05)",
        }}
      >
        <div className="grid place-items-center w-[74px] h-[74px] rounded-[20px] mx-auto mb-[22px] animate-float-soft border border-primary/40" style={{ background: "linear-gradient(135deg,rgba(110,139,255,.25),rgba(94,92,230,.15))" }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
          </svg>
        </div>
        <div className="font-display font-semibold text-xl">Перетащите прайсы сюда</div>
        <div className="mt-2 text-[14.5px] text-ink/50">
          или <span className="text-lav font-semibold">выберите файлы</span> — PDF, Excel, CSV, фото и сканы
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.docx"
          className="hidden"
          onChange={(e) => { addFiles(mapFiles(e.target.files)); e.target.value = ""; }}
        />
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {["До 200 МБ", "Пакетная загрузка", "Распознавание сканов"].map((t) => (
            <span key={t} className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[9px] bg-white/5 border border-white/[.08] text-[12.5px] text-ink/60">{t}</span>
          ))}
        </div>
      </div>

      {/* ---------- Заголовок очереди + демо-файлы ---------- */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-ink/70">
          Файлы в очереди <span className="text-ink/40">({files.length})</span>
        </div>
        <button
          onClick={() => addFiles(DEMO_FILES)}
          className="inline-flex items-center gap-2 px-[15px] py-[9px] rounded-[11px] bg-white/5 border border-white/10 text-ink text-[13px] font-semibold transition-all hover:bg-white/[.09]"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Добавить демо-файлы
        </button>
      </div>

      {/* ---------- Список файлов ---------- */}
      <div className="flex flex-col gap-[10px]">
        {files.length === 0 ? (
          <div className="p-[34px] text-center rounded-[18px] border border-white/[.06] bg-white/[.015] text-ink/40 text-[14.5px]">
            Пока пусто. Перетащите файлы или добавьте демо-набор, чтобы увидеть обработку.
          </div>
        ) : (
          files.map((f) => (
            <div key={f.id} className="flex items-center gap-[14px] px-4 py-[13px] rounded-[14px] bg-white/[.03] border border-white/[.08] animate-fade-up">
              <span className="grid place-items-center w-10 h-10 rounded-[11px] bg-primary/[.12] border border-primary/25 shrink-0">
                <FileIcon type={f.type} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{f.name}</div>
                <div className="text-xs text-ink/45 mt-[2px]">{f.size} · готов к обработке</div>
              </div>
              <span className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-lg text-[11.5px] font-semibold border" style={{ background: "rgba(48,209,88,.1)", borderColor: "rgba(48,209,88,.25)", color: "#5BE892" }}>
                <span className="w-[6px] h-[6px] rounded-full" style={{ background: "#30D158" }} />OK
              </span>
              <button onClick={() => removeFile(f.id)} className="grid place-items-center w-[30px] h-[30px] rounded-[9px] bg-white/5 border border-white/10 text-ink/50 hover:text-danger-soft">
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* ---------- Запуск обработки ---------- */}
      <div className="flex items-center justify-between gap-4 px-[22px] py-[18px] rounded-[18px] bg-white/[.025] border border-white/[.07]">
        <div>
          <div className="text-[14.5px] font-semibold">Готовы к обработке?</div>
          <div className="text-[13px] text-ink/45 mt-[2px]">MedPartners распознает, нормализует и сравнит все позиции автоматически.</div>
        </div>
        <button
          disabled={files.length === 0}
          onClick={() => navigate("/app/analyzing")}
          className="inline-flex items-center gap-[10px] px-[26px] py-[14px] rounded-[13px] text-[15px] font-semibold transition-all whitespace-nowrap disabled:cursor-not-allowed"
          style={
            files.length
              ? { background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", color: "#fff", boxShadow: "0 10px 30px rgba(94,92,230,.4)" }
              : { background: "rgba(94,92,230,.3)", color: "rgba(255,255,255,.5)" }
          }
        >
          Запустить обработку
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}
