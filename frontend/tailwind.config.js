/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      // ---------- Цветовая система PriceFlow (тёмная тема из дизайна) ----------
      colors: {
        bg: "#08080C", // основной фон приложения
        panel: "#0E0E14", // фон сайдбара/панелей
        ink: "#F5F5F7", // основной текст
        primary: {
          DEFAULT: "#5E5CE6", // фирменный индиго
          400: "#6E8BFF", // светлый акцент (градиенты, иконки)
          500: "#5E5CE6",
          600: "#5E5CE6",
        },
        violet: "#A78BFA", // вторичный акцент в градиентах
        lav: "#9DB0FF", // лавандовый текст/иконки
        success: {
          DEFAULT: "#30D158", // зелёный (успех, лучшая цена)
          soft: "#5BE892", // светло-зелёный текст
        },
        danger: {
          DEFAULT: "#FF5F57",
          soft: "#FF8B85",
        },
      },
      // ---------- Шрифты (подключены в index.css через Google Fonts) ----------
      fontFamily: {
        display: ["Sora", "system-ui", "sans-serif"], // заголовки
        sans: ["Manrope", "system-ui", "sans-serif"], // основной текст
      },
      // ---------- Фирменные градиенты (используются как bg-brand и т.п.) ----------
      backgroundImage: {
        brand: "linear-gradient(135deg,#6E8BFF,#5E5CE6)", // основной градиент кнопок/логотипа
        "brand-text": "linear-gradient(115deg,#6E8BFF,#A78BFA 55%,#5E5CE6)", // градиентный текст
        "brand-soft": "linear-gradient(135deg,rgba(94,92,230,.16),rgba(167,139,250,.07))", // мягкая подложка (шапки)
        "brand-cta": "linear-gradient(135deg,rgba(94,92,230,.18),rgba(167,139,250,.1))", // CTA-блок лендинга
        panel: "linear-gradient(180deg,rgba(20,20,28,.7),rgba(12,12,18,.7))", // стеклянная панель
        "panel-soft": "linear-gradient(180deg,rgba(20,20,28,.7),rgba(12,12,18,.6))", // вариант панели
        progress: "linear-gradient(90deg,#6E8BFF,#A78BFA)", // прогресс-бары
        bar: "linear-gradient(180deg,rgba(110,139,255,.85),rgba(94,92,230,.3))", // столбики графика
        "bar-peak": "linear-gradient(180deg,#A78BFA,#5E5CE6)", // пиковый столбик
        "bar-min": "linear-gradient(180deg,#5BE892,#1F8A5B)", // минимальный (лучшая цена)
        "feature-card": "linear-gradient(180deg,rgba(255,255,255,.026),rgba(255,255,255,.004))",
        "stat-text": "linear-gradient(120deg,#fff,#9DB0FF)", // градиентные цифры статистики
      },
      // ---------- Тени из дизайна ----------
      boxShadow: {
        brand: "0 10px 30px rgba(94,92,230,.4)", // кнопка
        "brand-lg": "0 16px 44px rgba(94,92,230,.55)", // кнопка hover
        "brand-glow": "0 0 18px rgba(94,92,230,.6)", // свечение логотипа
        "brand-glow-lg": "0 0 30px rgba(94,92,230,.55)",
        card: "0 30px 80px rgba(0,0,0,.5)", // карточки авторизации
        "card-hero": "0 40px 120px rgba(0,0,0,.6),0 0 80px rgba(94,92,230,.15)", // карточка hero
        panel: "0 30px 90px rgba(0,0,0,.5)", // панели анализа
        toast: "0 16px 50px rgba(0,0,0,.5)",
        sheet: "0 -20px 60px rgba(0,0,0,.5)", // нижний шит
      },
      dropShadow: {
        icon: "0 4px 14px rgba(94,92,230,.35)", // иконки возможностей
      },
      // ---------- Анимации из дизайна ----------
      keyframes: {
        auroraA: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(55px,-35px) scale(1.16)" },
        },
        auroraB: {
          "0%,100%": { transform: "translate(0,0) scale(1.1)" },
          "50%": { transform: "translate(-65px,40px) scale(.9)" },
        },
        auroraC: {
          "0%,100%": { transform: "translate(0,0) scale(1)" },
          "50%": { transform: "translate(40px,50px) scale(1.2)" },
        },
        floatSoft: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        pulseDot: {
          "0%,100%": { opacity: ".35", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.35)" },
        },
        fadeUpItem: {
          from: { opacity: "0", transform: "translateY(13px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        logIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        spinSlow: { to: { transform: "rotate(360deg)" } },
      },
      animation: {
        "aurora-a": "auroraA 18s ease-in-out infinite",
        "aurora-b": "auroraB 22s ease-in-out infinite",
        "aurora-c": "auroraC 18s ease-in-out infinite",
        "float-soft": "floatSoft 4s ease-in-out infinite",
        "pulse-dot": "pulseDot 1.8s infinite",
        "fade-up": "fadeUpItem .4s cubic-bezier(.16,1,.3,1) both",
        "log-in": "logIn .3s ease both",
        marquee: "marquee 26s linear infinite",
        "spin-slow": "spinSlow 9s linear infinite",
      },
    },
  },
  plugins: [],
};
