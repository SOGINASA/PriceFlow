import { useCallback, useEffect, useState } from "react";
import useAuthStore from "../store/useAuthStore";
import usePartnerStore from "../store/usePartnerStore";
import { meApi } from "../api";
import { toClinicCard, toServiceItem } from "../lib/partnerCard";

// ---------- Данные кабинета партнёра ----------
// API-first: если партнёр вошёл через бэкенд (есть JWT) — данные и правки идут
// в БД (видны всем пользователям). Если бэкенд недоступен или это демо-режим
// (переключатель роли без входа) — мягкий фолбэк на локальный usePartnerStore,
// чтобы интерфейс оставался рабочим офлайн.
//
// Страницы используют единый интерфейс (clinic, items, actions) и не знают,
// откуда данные.
export function usePartnerCabinet() {
  const { token, role, partnerId } = useAuthStore();
  const store = usePartnerStore();
  const online = !!token && role === "partner";
  const localId = partnerId || "alpha";

  const [clinic, setClinic] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(online ? "api" : "local");

  const loadLocal = useCallback(() => {
    setClinic(store.getClinic(localId));
    setItems(store.getServices(localId));
    setSource("local");
    setLoading(false);
  }, [store, localId]);

  const refresh = useCallback(async () => {
    if (online) {
      try {
        const [me, its] = await Promise.all([meApi.get(), meApi.items()]);
        setClinic(me.clinic ? toClinicCard(me.clinic) : null);
        setItems((its || []).map(toServiceItem));
        setSource("api");
        setLoading(false);
        return;
      } catch {
        // бэкенд недоступен — переходим на локальные данные
      }
    }
    loadLocal();
  }, [online, loadLocal]);

  useEffect(() => { refresh(); }, [refresh]);

  // --- действия (API при online, иначе локальный стор) ---
  const addService = async (form) => {
    if (source === "api") {
      await meApi.addItem({ name: form.name, category: form.category, resident: form.resident, nonresident: form.nonResident, effective_date: form.effectiveDate });
      return refresh();
    }
    store.addService(localId, form);
    loadLocal();
  };

  const updatePrice = async (id, form) => {
    if (source === "api") {
      await meApi.updateItem(id, { resident: form.resident, nonresident: form.nonResident, effective_date: form.effectiveDate });
      return refresh();
    }
    store.updatePrice(localId, id, form);
    loadLocal();
  };

  const updateService = async (id, patch) => {
    if (source === "api") {
      await meApi.updateItem(id, { name: patch.name });
      return refresh();
    }
    store.updateService(localId, id, patch);
    loadLocal();
  };

  const removeService = async (id) => {
    if (source === "api") {
      await meApi.removeItem(id);
      return refresh();
    }
    store.removeService(localId, id);
    loadLocal();
  };

  const updateClinic = async (patch) => {
    if (source === "api") {
      const updated = await meApi.updateClinic(patch);
      setClinic(toClinicCard(updated));
      return;
    }
    store.updateClinic(localId, patch);
    loadLocal();
  };

  return { clinic, items, loading, source, addService, updatePrice, updateService, removeService, updateClinic };
}
