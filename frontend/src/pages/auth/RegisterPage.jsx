import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout, { AuthHeader } from "./AuthLayout";
import Field from "../../components/ui/Field";
import useAuthStore from "../../store/useAuthStore";

export default function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({ name: "", organization: "", email: "", password: "" });
  const [role, setRole] = useState("user");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Сохраняем профиль с выбранной ролью и идём на настройку биометрии.
  const handleContinue = () => {
    register({ name: form.name || "Новый пользователь", email: form.email, organization: form.organization }, role);
    navigate("/biometric?mode=fp");
  };

  // Карточка выбора роли (Пользователь / Администратор).
  const RoleOption = ({ value, title, desc, icon }) => {
    const on = role === value;
    return (
      <button
        onClick={() => setRole(value)}
        className="flex-1 flex items-center gap-[10px] p-[13px] rounded-[13px] border text-left text-ink transition-all"
        style={{ background: on ? "rgba(94,92,230,.12)" : "rgba(255,255,255,.04)", borderColor: on ? "rgba(94,92,230,.45)" : "rgba(255,255,255,.1)" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={on ? "#9DB0FF" : "rgba(245,245,247,.6)"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
        <span>
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-[11.5px] text-ink/45">{desc}</span>
        </span>
      </button>
    );
  };

  return (
    <AuthLayout>
      <section className="w-full max-w-[460px]">
        <AuthHeader title="Создать аккаунт" subtitle="Пара шагов — и вы внутри MedPartners" />

        <div className="rounded-3xl border border-white/[.09] p-7" style={{ background: "rgba(20,20,28,.72)", backdropFilter: "blur(22px)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Field label="Имя" placeholder="Алия" value={form.name} onChange={set("name")} />
              </div>
              <div className="flex-1">
                <Field label="Организация" placeholder="Клиника «Альфа»" value={form.organization} onChange={set("organization")} />
              </div>
            </div>
            <Field label="Email" type="email" placeholder="you@clinic.kz" value={form.email} onChange={set("email")} />
            <Field label="Пароль" type="password" placeholder="Минимум 8 символов" value={form.password} onChange={set("password")} />

            {/* Тип аккаунта */}
            <div className="mt-[2px]">
              <span className="text-[12.5px] font-semibold text-ink/60">Тип аккаунта</span>
              <div className="flex gap-[10px] mt-[9px]">
                <RoleOption value="user" title="Пользователь" desc="Загрузка и отчёты" icon={<><circle cx="12" cy="8" r="3.4" /><path d="M5.5 19a6.5 6.5 0 0 1 13 0" /></>} />
                <RoleOption value="admin" title="Администратор" desc="Полный контроль" icon={<><path d="M12 3 5 6v5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></>} />
              </div>
            </div>

            <button
              onClick={handleContinue}
              className="mt-[6px] w-full p-[14px] rounded-[13px] text-white text-[15px] font-semibold transition-transform hover:-translate-y-[2px]"
              style={{ background: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", boxShadow: "0 10px 30px rgba(94,92,230,.4)" }}
            >
              Продолжить → настройка биометрии
            </button>
          </div>
        </div>

        <p className="text-center mt-[22px] text-sm text-ink/50">
          Уже есть аккаунт?{" "}
          <button onClick={() => navigate("/login")} className="text-lav font-semibold">Войти</button>
        </p>
      </section>
    </AuthLayout>
  );
}
