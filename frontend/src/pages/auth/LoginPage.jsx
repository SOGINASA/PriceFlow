import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout, { AuthHeader } from "./AuthLayout";
import Field from "../../components/ui/Field";
import useAuthStore from "../../store/useAuthStore";
import { adminApi } from "../../api";

export default function LoginPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Реальный вход оператора/администратора через бэкенд (POST /api/admin/login).
  const handleLogin = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await adminApi.login({ username: email, password });
      const role = res.user?.role || "admin";
      setSession({
        user: { name: res.user?.full_name || email, email },
        role,
        token: res.access_token,
      });
      // Оператор → очередь верификации, админ → аналитика платформы.
      navigate(role === "operator" ? "/app/verification" : "/app/admin");
    } catch (e) {
      setError("Неверный email или пароль");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <section className="w-full max-w-[440px]">
        <AuthHeader title="С возвращением" subtitle="Войдите в MedPartners, чтобы продолжить" />

        <div className="rounded-3xl border border-white/[0.09] p-7 bg-[rgba(20,20,28,0.72)] backdrop-blur-[22px] shadow-card">
          {/* Email / пароль */}
          <div className="flex flex-col gap-3">
            <Field label="Email" type="email" placeholder="operator@medarchive.kz" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Field label="Пароль" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
            {error && (
              <div className="text-[13px] font-semibold px-[14px] py-[10px] rounded-[11px] border" style={{ background: "rgba(255,95,87,.1)", borderColor: "rgba(255,95,87,.3)", color: "#FF8B85" }}>
                {error}
              </div>
            )}
            <button
              onClick={handleLogin}
              disabled={busy}
              className="mt-1 w-full p-[14px] rounded-[13px] text-white text-[15px] font-semibold transition-transform hover:-translate-y-[2px] bg-brand shadow-brand disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {busy ? "Вход…" : "Войти"}
            </button>
            <p className="text-[12px] text-ink/35 text-center mt-1">
              Демо-доступ оператора: <span className="text-ink/55">operator@medarchive.kz / operator123</span>
            </p>
          </div>
        </div>
      </section>
    </AuthLayout>
  );
}
