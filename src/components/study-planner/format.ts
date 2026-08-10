// Shared formatting helpers for task rows across the planner.

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

const PRIORITY_TEXT_COLOR: Record<string, string> = {
  low: "text-trust",
  medium: "text-insight",
  high: "text-warning",
};

export function priorityTextClass(priority: string): string {
  return PRIORITY_TEXT_COLOR[priority] ?? "text-secondary";
}

// "Today" / "Tomorrow" / a locale-formatted short date — matches the
// spec's own Upcoming Tasks example ("Today", "Tomorrow", "May 17").
export function formatRelativeDate(
  dateIso: string,
  todayIso: string,
  locale: string,
  todayLabel: string,
  tomorrowLabel: string,
): string {
  if (dateIso === todayIso) return todayLabel;

  const today = new Date(`${todayIso}T00:00:00Z`);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(today.getUTCDate() + 1);
  if (dateIso === tomorrow.toISOString().slice(0, 10)) return tomorrowLabel;

  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
    new Date(`${dateIso}T00:00:00Z`),
  );
}
