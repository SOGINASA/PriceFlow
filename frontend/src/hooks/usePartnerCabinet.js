import { useCallback, useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import { meApi } from "../api";
import { toClinicCard, toServiceItem } from "../lib/partnerCard";

// ---------- Данные кабинета партнёра (только бэкенд/БД, без моков) ----------
// Партнёр входит через бэкенд (JWT) — профиль и прайс читаются из БД, правки
// пишутся туда же и видны всем пользователям. Без активной сессии партнёра или
// при недоступном бэкенде кабинет пуст (никаких демо-данных).
//
// Страницы используют единый интерфейс (clinic, items, actions) и не знают,
// откуда данные.
export function usePartnerCabinet() {
  const { token, role } = useAuthStore();
  const online = !!token && role === "partner";

  const [clinic, setClinic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!online) {
      setClinic(null);
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [me, its] = await Promise.all([meApi.get(), meApi.items()]);
      setClinic(me.clinic ? toClinicCard(me.clinic) : null);
      setItems((its || []).map(toServiceItem));
    } catch {
      // бэкенд недоступен — показываем пустой кабинет, без подмены моками
      setClinic(null);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [online]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- действия (работают только при активной сессии партнёра) ---
  const addService = async (form) => {
    if (!online) return;
    await meApi.addItem({
      name: form.name, category: form.category,
      resident: form.resident, nonresident: form.nonResident,
      effective_date: form.effectiveDate,
    });
    return refresh();
  };

  const updatePrice = async (id, form) => {
    if (!online) return;
    await meApi.updateItem(id, {
      resident: form.resident, nonresident: form.nonResident,
      effective_date: form.effectiveDate,
    });
    return refresh();
  };

  const updateService = async (id, patch) => {
    if (!online) return;
    await meApi.updateItem(id, { name: patch.name });
    return refresh();
  };

  const removeService = async (id) => {
    if (!online) return;
    await meApi.removeItem(id);
    return refresh();
  };

  const updateClinic = async (patch) => {
    if (!online) return;
    const updated = await meApi.updateClinic(patch);
    setClinic(toClinicCard(updated));
  };

  return {
    clinic, items, loading,
    online,
    addService, updatePrice, updateService, removeService, updateClinic,
  };
}
