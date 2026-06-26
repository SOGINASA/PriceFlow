// ---------- Анимированный фон «аврора» ----------
// Размытые цветные пятна, медленно плавающие на фоне. Используется в
// приложении и на лендинге. variant переключает раскладку пятен.
// Радиальные градиенты заданы Tailwind-классами (arbitrary values).
export default function Aurora({ variant = "app" }) {
  if (variant === "app") {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[15%] left-[8%] w-[620px] h-[620px] rounded-full blur-[50px] animate-aurora-a bg-[radial-gradient(circle,rgba(94,92,230,.4),transparent_62%)]" />
        <div className="absolute -bottom-[20%] right-[4%] w-[600px] h-[600px] rounded-full blur-[55px] animate-aurora-b bg-[radial-gradient(circle,rgba(167,139,250,.32),transparent_62%)]" />
      </div>
    );
  }

  // variant === "hero" — три пятна для шапки лендинга
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute -top-[10%] left-1/2 -ml-[380px] w-[760px] h-[760px] rounded-full blur-[40px] animate-aurora-a bg-[radial-gradient(circle,rgba(94,92,230,.55),transparent_62%)]" />
      <div className="absolute top-[6%] left-[14%] w-[520px] h-[520px] rounded-full blur-[50px] animate-aurora-b bg-[radial-gradient(circle,rgba(110,139,255,.42),transparent_62%)]" />
      <div className="absolute top-[14%] right-[10%] w-[560px] h-[560px] rounded-full blur-[50px] animate-aurora-c bg-[radial-gradient(circle,rgba(167,139,250,.4),transparent_62%)]" />
    </div>
  );
}
