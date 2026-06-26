import LandingNav from "../components/landing/LandingNav";
import Hero from "../components/landing/Hero";
import TrustMarquee from "../components/landing/TrustMarquee";
import Pipeline from "../components/landing/Pipeline";
import Stats from "../components/landing/Stats";
import Features from "../components/landing/Features";
import ClinicSearchSection from "../components/landing/ClinicSearchSection";
import Security from "../components/landing/Security";
import FinalCTA from "../components/landing/FinalCTA";
import LandingFooter from "../components/landing/LandingFooter";

// ---------- Лендинг (публичная главная страница) ----------
// Композиция секций в порядке из дизайна MedPartners Landing.
export default function LandingPage() {
  return (
    <div className="relative w-full bg-bg overflow-hidden">
      <LandingNav />
      <Hero />
      <TrustMarquee />
      <Pipeline />
      <Stats />
      <Features />
      <ClinicSearchSection />
      <Security />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
