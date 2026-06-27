import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useUploadStore from "../../store/useUploadStore";
import { formatFileSize, fileTypeOf } from "../../lib/format";
import FileIcon from "../../components/ui/FileIcon";
import { useToast } from "../../components/ui/Toast";

export default function UploadPage() {
  const navigate = useNavigate();
  const { files, addFiles, removeFile, setPending } = useUploadStore();
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [city, setCity] = useState("");
  const toast = useToast();

  // Преобразуем нативные File в нашу структуру очереди (raw — сам File для отправки).
  const mapFiles = (list) =>
    Array.from(list).map((f) => ({ name: f.name, size: formatFileSize(f.size), type: fileTypeOf(f.name), raw: f }));

  // Запуск обработки: НЕ грузим здесь, а складываем задачу в стор и сразу
  // переходим к экрану анализа. Саму синхронную загрузку на бэкенд делает он —
  // тогда кольцо прогресса крутится во время реальной обработки.
  const startProcessing = () => {
    const realFiles = files.map((f) => f.raw).filter(Boolean);
    if (realFiles.length === 0) {
      toast("Добавьте файлы прайсов для обработки");
      return;
    }
    setPending({ files: realFiles, partnerName: partnerName.trim(), city: city.trim() });
    navigate("/app/analyzing");
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files || []);
    if (dropped.length) addFiles(mapFiles(dropped));
  };

  const canRun = files.length > 0;

  return (
    <section className="flex flex-col gap-[22px] animate-fade-up">
      {/* ---------- Зона перетаскивания ---------- */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`relative rounded-3xl text-center cursor-pointer transition-all p-[54px] px-[30px] border-[1.6px] border-dashed ${
          dragOver ? "border-primary/90 bg-primary/[0.12]" : "border-primary/40 bg-primary/[0.05]"
        }`}
      >
        <div className="grid place-items-center w-[74px] h-[74px] rounded-[20px] mx-auto mb-[22px] animate-float-soft border border-primary/40 bg-[linear-gradient(135deg,rgba(110,139,255,.25),rgba(94,92,230,.15))]">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5" /><path d="M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16" />
          </svg>
        </div>
        <div className="font-display font-semibold text-xl">Перетащите прайсы сюда</div>
        <div className="mt-2 text-[14.5px] text-ink/50">
          или <span className="text-lav font-semibold">выберите файлы</span> — PDF, Excel, CSV, DOCX, фото, сканы и <span className="text-lav font-semibold">ZIP-архивы</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv,.png,.jpg,.jpeg,.tif,.tiff,.bmp,.docx,.zip"
          className="hidden"
          onChange={(e) => { addFiles(mapFiles(e.target.files)); e.target.value = ""; }}
        />
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {["До 200 МБ", "Пакетная загрузка", "Распознавание сканов"].map((t) => (
            <span key={t} className="inline-flex items-center gap-[6px] px-3 py-[6px] rounded-[9px] bg-white/5 border border-white/[0.08] text-[12.5px] text-ink/60">{t}</span>
          ))}
        </div>
      </div>

      {/* ---------- Клиника и город (необязательно) ---------- */}
      <div className="rounded-[18px] bg-white/[0.025] border border-white/[0.07] p-[18px] sm:p-5">
        <div className="text-[14.5px] font-semibold">Клиника прайса</div>
        <div className="text-[13px] text-ink/45 mt-[2px]">
          Необязательно. Если не указать — клиника определится по имени файла, а город останется пустым.
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4">
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-ink/45">Название клиники</span>
            <input
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Напр. Клиника «Альфа»"
              className="px-[14px] py-[11px] rounded-[11px] bg-[rgba(12,12,18,0.7)] border border-white/10 outline-none text-[14px] text-ink transition-colors focus:border-primary/60"
            />
          </label>
          <label className="flex flex-col gap-[6px]">
            <span className="text-[12px] text-ink/45">Город</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Напр. Алматы"
              className="px-[14px] py-[11px] rounded-[11px] bg-[rgba(12,12,18,0.7)] border border-white/10 outline-none text-[14px] text-ink transition-colors focus:border-primary/60"
            />
          </label>
        </div>
      </div>

      {/* ---------- Заголовок очереди ---------- */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink/70">
          Файлы в очереди <span className="text-ink/40">({files.length})</span>
        </div>
      </div>

      {/* ---------- Список файлов ---------- */}
      <div className="flex flex-col gap-[10px]">
        {files.length === 0 ? (
          <div className="p-[34px] text-center rounded-[18px] border border-white/[0.06] bg-white/[0.015] text-ink/40 text-[14.5px]">
            Пока пусто. Перетащите прайсы или выберите файлы, чтобы запустить обработку.
          </div>
        ) : (
          files.map((f) => (
            <div key={f.id} className="flex items-center gap-[14px] px-4 py-[13px] rounded-[14px] bg-white/[0.03] border border-white/[0.08] animate-fade-up">
              <span className="grid place-items-center w-10 h-10 rounded-[11px] bg-primary/[0.12] border border-primary/25 shrink-0">
                <FileIcon type={f.type} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{f.name}</div>
                <div className="text-xs text-ink/45 mt-[2px]">{f.size} · готов к обработке</div>
              </div>
              <span className="inline-flex items-center gap-[6px] px-[10px] py-[5px] rounded-lg text-[11.5px] font-semibold bg-success/[0.1] border border-success/25 text-success-soft">
                <span className="w-[6px] h-[6px] rounded-full bg-success" />OK
              </span>
              <button onClick={() => removeFile(f.id)} className="grid place-items-center w-[30px] h-[30px] rounded-[9px] bg-white/5 border border-white/10 text-ink/50 hover:text-danger-soft shrink-0">
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {/* ---------- Запуск обработки (на мобиле — вертикально) ---------- */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-[22px] py-[18px] rounded-[18px] bg-white/[0.025] border border-white/[0.07]">
        <div>
          <div className="text-[14.5px] font-semibold">Готовы к обработке?</div>
          <div className="text-[13px] text-ink/45 mt-[2px]">MedPartners распознает, нормализует и сравнит все позиции автоматически.</div>
        </div>
        <button
          disabled={!canRun}
          onClick={startProcessing}
          className={`inline-flex items-center justify-center gap-[10px] px-[26px] py-[14px] rounded-[13px] text-[15px] font-semibold transition-all whitespace-nowrap shrink-0 max-sm:w-full ${
            canRun ? "bg-brand text-white shadow-brand hover:-translate-y-[2px] hover:shadow-brand-lg" : "bg-primary/30 text-white/50 cursor-not-allowed"
          }`}
        >
          Запустить обработку
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </button>
      </div>
    </section>
  );
}
