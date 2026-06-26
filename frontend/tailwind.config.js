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
