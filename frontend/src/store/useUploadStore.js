import { create } from "zustand";

// ---------- Стор очереди загрузки ----------
// Файлы, поставленные в очередь на обработку. Используется экранами
// «Загрузка» → «Анализ» → «Отчёт». Файлы отправляются на бэкенд через
// archivesApi.upload (см. UploadPage.startProcessing).

let idSeq = 0;

const useUploadStore = create((set, get) => ({
  files: [], // [{ id, name, size, type }]

  // Добавить файлы в очередь (нормализуем к единой структуре).
  addFiles: (incoming) =>
    set((state) => ({
      files: [
        ...state.files,
        ...incoming.map((f) => ({ id: `f${++idSeq}`, ...f })),
      ],
    })),

  // Удалить файл по id.
  removeFile: (id) =>
    set((state) => ({ files: state.files.filter((f) => f.id !== id) })),

  // Очистить очередь (например, после успешной обработки).
  clear: () => set({ files: [] }),

  // Признак готовности к запуску обработки.
  hasFiles: () => get().files.length > 0,
}));

export default useUploadStore;
