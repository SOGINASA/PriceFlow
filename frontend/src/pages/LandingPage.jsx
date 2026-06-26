import { useEffect, useState } from "react";
import LandingNav from "../components/landing/LandingNav";
import Hero from "../components/landing/Hero";
import TrustMarquee from "../components/landing/TrustMarquee";
import Pipeline from "../components/landing/Pipeline";
import Stats from "../components/landing/Stats";
import Features from "../components/landing/Features";
import ClinicSearchSection from "../components/landing/ClinicSearchSection";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";
import { dashboardApi, analyticsApi } from "../api";

// ---------- Лендинг (публичная главная страница) ----------
// Данные витрины (показатели + карточка-превью отчёта) тянутся из реального
// бэкенда: /dashboard/stats и первый сводный отчёт /analytics/reports.
export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [report, setReport] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await dashboardApi.stats();
        if (alive) setStats(s);
      } catch { /* бэкенд недоступен — показатели останутся нулевыми */ }
      try {
        const list = await analyticsApi.reports();
        if (alive && Array.isArray(list) && list.length) {
          const detail = await analyticsApi.report(list[0].id);
          if (alive) setReport(detail);
        }
      } catch { /* отчётов ещё нет — карточка покажет пустое состояние */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div className="relative w-full bg-bg overflow-hidden">
      <LandingNav />
      <Hero report={report} />
      <TrustMarquee />
      <Pipeline report={report} />
      <Stats stats={stats} />
      <Features />
      <ClinicSearchSection />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
