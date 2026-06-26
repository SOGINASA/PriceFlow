// ---------- Построение уведомлений из реальных данных бэкенда ----------
// Уведомлений как отдельной сущности в API нет, поэтому собираем их из
// фактического состояния системы: статусы обработанных документов
// (GET /archives) и метрики очередей (GET /dashboard/stats).
import { dashboardApi, archivesApi } from "../api";

// Относительное время в стиле интерфейса: «2 мин назад», «3 ч назад», «вчера».
function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const sec = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (sec < 60) return "только что";
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const day = Math.round(hr / 24);
  if (day === 1) return "вчера";
  return `${day} дн назад`;
}

const STATUS_NOTE = {
  done: { type: "success", title: "Обработка завершена", unread: false,
    text: (d) => `Документ «${d.file_name}» обработан и добавлен в базу.` },
  error: { type: "error", title: "Ошибка распознавания", unread: true,
    text: (d) => `Файл «${d.file_name}» не удалось обработать.` },
  needs_review: { type: "warning", title: "Требуется проверка", unread: true,
    text: (d) => `Документ «${d.file_name}» требует ручной верификации.` },
  processing: { type: "info", title: "Идёт обработка", unread: false,
    text: (d) => `Документ «${d.file_name}» обрабатывается.` },
  pending: { type: "info", title: "В очереди", unread: false,
    text: (d) => `Документ «${d.file_name}» поставлен в очередь.` },
};

// Возвращает { items: [...], unread: number }. При недоступном бэкенде — пусто.
export async function buildNotifications() {
  const [stats, docs] = await Promise.all([
    dashboardApi.stats().catch(() => null),
    archivesApi.list({}).catch(() => []),
  ]);

  const items = [];
  const now = new Date().toISOString();

  // Сводные предупреждения из метрик очередей.
  if (stats?.items?.anomalies > 0) {
    items.push({
      id: "q-anomalies", type: "warning", title: "Аномалии цен",
      text: `${stats.items.anomalies} позиций с отклонением цены требуют подтверждения.`,
      ts: now, time: "сейчас", unread: true,
    });
  }
  if (stats?.items?.unmatched > 0) {
    items.push({
      id: "q-unmatched", type: "warning", title: "Требуется проверка",
      text: `${stats.items.unmatched} позиций не сопоставлены со справочником. Откройте очередь верификации.`,
      ts: now, time: "сейчас", unread: true,
    });
  }

  // Последние обработанные документы.
  (Array.isArray(docs) ? docs : []).slice(0, 12).forEach((d) => {
    const note = STATUS_NOTE[d.parse_status];
    if (!note) return;
    const when = d.parsed_at || d.created_at;
    items.push({
      id: `doc-${d.doc_id}`,
      type: note.type,
      title: note.title,
      text: note.text(d),
      ts: when || now,
      time: timeAgo(when),
      unread: note.unread,
    });
  });

  // Новые сверху.
  items.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  const unread = items.filter((n) => n.unread).length;
  return { items, unread };
}
