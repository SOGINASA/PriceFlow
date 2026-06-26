import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout, { AuthHeader } from "./AuthLayout";
import Field from "../../components/ui/Field";
import useAuthStore from "../../store/useAuthStore";
import { adminApi } from "../../api";

// Кнопка OAuth-провайдера.
function OAuthButton({ children, primary }) {
  return (
    <button
      className="flex items-center justify-center gap-[11px] w-full p-[13px] rounded-[13px] cursor-pointer text-[15px] font-semibold transition-all hover:-translate-y-[1px]"
      style={
        primary
          ? { background: "#fff", color: "#1a1a1a", border: "none" }
          : { background: "rgba(255,255,255,.06)", color: "#F5F5F7", border: "1px solid rgba(255,255,255,.12)" }
      }
    >
      {children}
    </button>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Вход по email/паролю через бэкенд (POST /api/admin/login).
  // Доступен операторам и админам; обычный демо-вход — через OAuth-кнопки ниже.
  const handleLogin = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await adminApi.login({ username: email, password });
      setSession({
        user: { name: res.user?.full_name || email, email },
        role: res.user?.role || "admin",
        token: res.access_token,
      });
      navigate("/app/verification");
    } catch (e) {
      setError("Неверный email или пароль");
    } finally {
      setBusy(false);
    }
  };

  // Демо-вход без бэкенда (для OAuth/биометрии).
  const handleDemoLogin = () => {
    login({ name: "Алия Нурлан", email });
    navigate("/app/upload");
  };

  return (
    <AuthLayout>
      <section className="w-full max-w-[440px]">
        <AuthHeader title="С возвращением" subtitle="Войдите в MedPartners, чтобы продолжить" />

        <div className="rounded-3xl border border-white/[.09] p-7" style={{ background: "rgba(20,20,28,.72)", backdropFilter: "blur(22px)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
          {/* OAuth (демо-вход без бэкенда) */}
          <div className="flex flex-col gap-[11px]">
            <div onClick={handleDemoLogin}>
              <OAuthButton primary>
                <svg width="19" height="19" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.6 9.2c0-.6-.05-1.2-.15-1.7H9v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5Z" />
                  <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.5-1.8.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18Z" />
                  <path fill="#FBBC05" d="M3.9 10.7a5.4 5.4 0 0 1 0-3.4V5H.9a9 9 0 0 0 0 8l3-2.3Z" />
                  <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.45 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6Z" />
                </svg>
                Продолжить с Google
              </OAuthButton>
            </div>
            <div onClick={handleDemoLogin}>
              <OAuthButton>
                <svg width="17" height="17" viewBox="0 0 16 16" fill="#F5F5F7">
                  <path d="M11 8.5c0-1.7 1.4-2.5 1.4-2.6-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.7 1.7-1.2 2-.3 5 .8 6.6.5.8 1.2 1.7 2 1.6.8 0 1.1-.5 2.1-.5s1.3.5 2.1.5 1.4-.8 1.9-1.6c.6-.9.9-1.8.9-1.8s-1.4-.6-1.4-2.1Zm-1.7-3.9c.4-.5.7-1.3.6-2-.6 0-1.4.4-1.8.9-.4.4-.8 1.2-.7 1.9.7.1 1.4-.3 1.9-.8Z" />
                </svg>
                Продолжить с Apple
              </OAuthButton>
            </div>
          </div>

          {/* Разделитель */}
          <div className="flex items-center gap-[14px] my-5">
            <div className="flex-1 h-px bg-white/[.09]" />
            <span className="text-[12.5px] text-ink/35">или по email</span>
            <div className="flex-1 h-px bg-white/[.09]" />
          </div>

          {/* Email / пароль */}
          <div className="flex flex-col gap-3">
            <Field label="Email" type="email" placeholder="operator@medarchive.kz" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Пароль" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            {error && (
              <div className="text-[13px] font-semibold px-[14px] py-[10px] rounded-[11px] border" style={{ background: "rgba(255,95,87,.1)", borderColor: "rgba(255,95,87,.3)", color: "#FF8B85" }}>
                {error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={busy}
              className="mt-1 w-full p-[14px] rounded-[13px] text-white text-[15px] font-semibold transition-transform hover:-translate-y-[2px] disabled:opacity-60 disabled:hover:translate-y-0"
              style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", boxShadow: "0 10px 30px rgba(94,92,230,.4)" }}
            >
              {busy ? "Вход…" : "Войти"}
            </button>
            <p className="text-[12px] text-ink/35 text-center mt-1">
              Демо-доступ оператора: <span className="text-ink/55">operator@medarchive.kz / operator123</span>
            </p>
          </div>

          {/* Быстрый вход */}
          <div className="flex items-center gap-[13px] mt-5">
            <div className="flex-1 h-px bg-white/[.09]" />
            <span className="text-xs text-ink/35">быстрый вход</span>
            <div className="flex-1 h-px bg-white/[.09]" />
          </div>
          <div className="flex gap-[11px] mt-4">
            <button onClick={() => navigate("/biometric?mode=fp")} className="flex-1 flex flex-col items-center gap-2 p-[15px] rounded-[14px] bg-white/[.04] border border-white/10 text-ink transition-all hover:border-primary/50 hover:bg-primary/[.08]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9DB0FF" strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 5.5c-3.4 0-6.2 2.8-6.2 6.2v2.8M18.2 14.5V11.7c0-3.4-2.8-6.2-6.2-6.2M8.4 15.6V11.7a3.6 3.6 0 0 1 7.2 0v4.4M10.7 16.2V11.7a1.3 1.3 0 0 1 2.6 0v5.2" />
              </svg>
              <span className="text-[12.5px] font-semibold">Отпечаток</span>
            </button>
            <button onClick={() => navigate("/biometric?mode=face")} className="flex-1 flex flex-col items-center gap-2 p-[15px] rounded-[14px] bg-white/[.04] border border-white/10 text-ink transition-all hover:border-violet/50 hover:bg-violet/[.08]">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#C9A8FF" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 9V7a1 1 0 0 1 1-1h2M15 6h2a1 1 0 0 1 1 1v2M18 15v2a1 1 0 0 1-1 1h-2M9 18H7a1 1 0 0 1-1-1v-2" />
                <circle cx="9.5" cy="11" r=".6" fill="#C9A8FF" />
                <circle cx="14.5" cy="11" r=".6" fill="#C9A8FF" />
                <path d="M12 11.5v2M10.5 15c1 .8 2 .8 3 0" />
              </svg>
              <span className="text-[12.5px] font-semibold">Лицо</span>
            </button>
          </div>
        </div>

        <p className="text-center mt-[22px] text-sm text-ink/50">
          Нет аккаунта?{" "}
          <button onClick={() => navigate("/register")} className="text-lav font-semibold">Создать</button>
        </p>
      </section>
    </AuthLayout>
  );
}
