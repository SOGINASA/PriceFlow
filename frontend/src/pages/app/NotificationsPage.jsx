import { useEffect } from "react";
import { NOTIFICATIONS } from "../../data/notifications";
import useUIStore from "../../store/useUIStore";

// Класс-наборы по типу уведомления (фон/рамка иконки + цвет иконки).
const TYPES = {
  success: { wrap: "bg-success/[0.12] border-success/30", text: "text-success-soft", icon: <path d="m5 13 4 4L19 7" /> },
  info: { wrap: "bg-primary/[0.14] border-primary/30", text: "text-lav", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
  warning: { wrap: "bg-[rgba(255,196,84,0.12)] border-[rgba(255,196,84,0.3)]", text: "text-[#FFD27A]", icon: <><path d="M12 4 2 20h20L12 4Z" /><path d="M12 10v4M12 17h.01" /></> },
  error: { wrap: "bg-danger/[0.12] border-danger/30", text: "text-danger-soft", icon: <><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></> },
};

export default function NotificationsPage() {
  const { unreadCount, markAllRead } = useUIStore();

  // Сбрасываем счётчик непрочитанных при открытии страницы.
  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, [unreadCount, markAllRead]);

  return (
    <section className="flex flex-col gap-3 animate-fade-up">
      {/* Заголовок списка + действие */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-ink/70">
          Все уведомления <span className="text-ink/40">({NOTIFICATIONS.length})</span>
        </div>
        <button onClick={markAllRead} className="text-[13px] font-semibold text-lav transition-colors hover:text-ink">
          Отметить прочитанными
        </button>
      </div>

      {/* Лента уведомлений */}
      <div className="flex flex-col gap-[10px]">
        {NOTIFICATIONS.map((n, i) => {
          const t = TYPES[n.type] || TYPES.info;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-[14px] px-4 py-[15px] rounded-[16px] border transition-colors ${
                n.unread ? "bg-primary/[0.06] border-primary/[0.22]" : "bg-white/[0.025] border-white/[0.07]"
              }`}
              style={{ animation: `fadeUpItem .4s ${i * 45}ms cubic-bezier(.16,1,.3,1) both` }}
            >
              {/* Иконка типа */}
              <span className={`grid place-items-center w-10 h-10 rounded-[12px] border shrink-0 ${t.wrap} ${t.text}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  {t.icon}
                </svg>
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14.5px] font-semibold truncate">{n.title}</span>
                  {n.unread && <span className="w-[7px] h-[7px] rounded-full shrink-0 bg-primary-400 shadow-[0_0_7px_#6E8BFF]" />}
                </div>
                <p className="text-[13px] text-ink/55 mt-[3px] leading-[1.5]">{n.text}</p>
                <div className="text-[12px] text-ink/35 mt-2">{n.time}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
