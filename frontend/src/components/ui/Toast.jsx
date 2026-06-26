import { createContext, useCallback, useContext, useState } from "react";

// ---------- Простая система всплывающих уведомлений ----------
// Оборачиваем приложение в <ToastProvider>, вызываем useToast().show(msg).
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message) => {
    setToast(message);
    // Автоскрытие через 2.2с (как в дизайне).
    window.clearTimeout(show._t);
    show._t = window.setTimeout(() => setToast(null), 2200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Тост */}
      <div
        className="fixed bottom-7 max-lg:bottom-[96px] left-1/2 z-[200] max-w-[calc(100vw-2rem)] flex items-center gap-[10px] px-5 py-[13px] rounded-[13px] text-sm font-semibold text-ink pointer-events-none transition-all bg-[rgba(20,20,28,0.92)] backdrop-blur-[18px] border border-primary/40 shadow-toast"
        style={{ transform: `translateX(-50%) translateY(${toast ? 0 : 20}px)`, opacity: toast ? 1 : 0 }}
      >
        <span className="grid place-items-center w-[22px] h-[22px] rounded-[7px] bg-success/[0.16]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#30D158" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
        </span>
        {toast}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
