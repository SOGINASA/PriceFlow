// ---------- Анимированный фон «аврора» ----------
// Размытые цветные пятна, медленно плавающие на фоне. Используется в
// приложении и на лендинге. variant переключает раскладку пятен.
export default function Aurora({ variant = "app" }) {
  if (variant === "app") {
    return (
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute rounded-full animate-aurora-a"
          style={{
            top: "-15%",
            left: "8%",
            width: 620,
            height: 620,
            background: "radial-gradient(circle,rgba(94,92,230,.4),transparent 62%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute rounded-full animate-aurora-b"
          style={{
            bottom: "-20%",
            right: "4%",
            width: 600,
            height: 600,
            background: "radial-gradient(circle,rgba(167,139,250,.32),transparent 62%)",
            filter: "blur(55px)",
          }}
        />
      </div>
    );
  }

  // variant === "hero" — три пятна для шапки лендинга
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
      <div
        className="absolute rounded-full animate-aurora-a"
        style={{
          top: "-10%",
          left: "50%",
          width: 760,
          height: 760,
          marginLeft: -380,
          background: "radial-gradient(circle,rgba(94,92,230,.55),transparent 62%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute rounded-full animate-aurora-b"
        style={{
          top: "6%",
          left: "14%",
          width: 520,
          height: 520,
          background: "radial-gradient(circle,rgba(110,139,255,.42),transparent 62%)",
          filter: "blur(50px)",
        }}
      />
      <div
        className="absolute rounded-full animate-aurora-c"
        style={{
          top: "14%",
          right: "10%",
          width: 560,
          height: 560,
          background: "radial-gradient(circle,rgba(167,139,250,.4),transparent 62%)",
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}
