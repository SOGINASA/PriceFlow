import { useNavigate } from "react-router-dom";
import ClinicSearch from "../../components/shared/ClinicSearch";

// ---------- Поиск по клиникам (в приложении) ----------
// Реализует п. 4.6 ТЗ: поиск услуги/клиники → переход в карточку партнёра.
export default function SearchPage() {
  const navigate = useNavigate();
  return (
    <section className="flex flex-col gap-[18px] animate-fade-up">
      <ClinicSearch
        placeholder="Введите название клиники, город или услугу…"
        noneText="Ничего не найдено. Попробуйте другой запрос."
        showArrow
        onSelect={(clinic) => navigate(`/app/partner/${clinic.id}`)}
      />
    </section>
  );
}
