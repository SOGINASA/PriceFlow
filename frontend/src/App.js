import { Routes, Route, Navigate } from "react-router-dom";

import { ToastProvider } from "./components/ui/Toast";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import BiometricPage from "./pages/auth/BiometricPage";

import AppLayout from "./components/layout/AppLayout";
import UploadPage from "./pages/app/UploadPage";
import AnalyzingPage from "./pages/app/AnalyzingPage";
import ReportsListPage from "./pages/app/ReportsListPage";
import ReportDetailPage from "./pages/app/ReportDetailPage";
import SearchPage from "./pages/app/SearchPage";
import PartnerPage from "./pages/app/PartnerPage";
import AdminPage from "./pages/app/AdminPage";
import NotificationsPage from "./pages/app/NotificationsPage";

// ---------- Карта маршрутов приложения ----------
// Публичные: лендинг и экраны авторизации.
// Приватные (внутри AppLayout): рабочая область с сайдбаром и топбаром.
export default function App() {
  return (
    <ToastProvider>
    <Routes>
      {/* Публичные страницы */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/biometric" element={<BiometricPage />} />

      {/* Рабочая область (общий layout: сайдбар + топбар) */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="upload" replace />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="analyzing" element={<AnalyzingPage />} />
        <Route path="report" element={<ReportsListPage />} />
        <Route path="report/:id" element={<ReportDetailPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="partner/:id" element={<PartnerPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>

      {/* Фолбэк на неизвестные пути */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ToastProvider>
  );
}
