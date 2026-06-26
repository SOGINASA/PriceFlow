import { Outlet, useLocation } from "react-router-dom";
import Aurora from "../ui/Aurora";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import MobileNav from "./MobileNav";
import ProfileSheet from "./ProfileSheet";

// ---------- Каркас рабочей области ----------
// Фиксированный сайдбар (десктоп) + липкий топбар + контент (Outlet) +
// нижняя навигация на мобильных.
export default function AppLayout() {
  const location = useLocation();
  // Текущий экран = первый сегмент после /app
  const screen = location.pathname.split("/")[2] || "upload";

  return (
    <div className="relative w-full min-h-screen bg-bg overflow-hidden">
      <Aurora variant="app" />

      <div className="relative z-[2] min-h-screen">
        <Sidebar screen={screen} />

        {/* Основная колонка (отступ под сайдбар на десктопе) */}
        <div className="lg:ml-[248px] min-h-screen flex flex-col">
          <Topbar screen={screen} />
          <main className="flex-1 p-[30px] max-lg:px-4 max-lg:pt-5 max-lg:pb-[108px] max-w-[1180px] w-full mx-auto">
            <Outlet />
          </main>
        </div>

        <MobileNav screen={screen} />
        <ProfileSheet />
      </div>
    </div>
  );
}
