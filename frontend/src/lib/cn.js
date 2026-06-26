// Утилита для объединения CSS-классов: отбрасывает falsy-значения.
// Пример: cn("base", isActive && "active") -> "base active"
export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}
