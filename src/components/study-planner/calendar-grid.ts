// Pure date-math helpers for MonthCalendar — no library, native Date
// only (the codebase has no date-fns/dayjs dependency anywhere).
// Every date is UTC-anchored (Date.UTC / getUTC*) so grid placement
// never drifts with the viewer's local timezone offset, matching
// scheduled_date's own DATE (timezone-free) column type.

export interface CalendarDay {
  date: string; // "YYYY-MM-DD"
  day: number; // day-of-month
  isCurrentMonth: boolean;
  isToday: boolean;
}

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayIsoDate(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return toIsoDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

export function addMonths(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

// Always 6 full weeks (42 days) for a stable grid height across
// months, Monday-first per the spec. Includes dimmed adjacent-month
// spillover days on both ends.
export function getMonthGridDays(
  year: number,
  month: number,
  todayIso: string,
): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  // getUTCDay(): 0=Sun..6=Sat. Convert to Monday-first offset (0=Mon..6=Sun).
  const mondayOffset = (firstOfMonth.getUTCDay() + 6) % 7;
  const gridStart = new Date(firstOfMonth);
  gridStart.setUTCDate(gridStart.getUTCDate() - mondayOffset);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setUTCDate(gridStart.getUTCDate() + i);
    const iso = toIsoDate(d);
    days.push({
      date: iso,
      day: d.getUTCDate(),
      isCurrentMonth: d.getUTCMonth() + 1 === month && d.getUTCFullYear() === year,
      isToday: iso === todayIso,
    });
  }
  return days;
}

export function getVisibleRangeBounds(
  year: number,
  month: number,
): { from: string; to: string } {
  const days = getMonthGridDays(year, month, "");
  return { from: days[0].date, to: days[days.length - 1].date };
}

// Locale-derived weekday header labels, Monday-first — Jan 1 2024 was
// a Monday, used purely as a stable anchor date for formatting.
export function getWeekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const labels: string[] = [];
  for (let i = 0; i < 7; i++) {
    labels.push(formatter.format(new Date(Date.UTC(2024, 0, 1 + i))));
  }
  return labels;
}

export function getMonthTitle(locale: string, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
}

// Monday–Sunday bounds of the week containing `dateIso` — backs
// Weekly Goal's completed/total query.
export function getWeekBounds(dateIso: string): { from: string; to: string } {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const mondayOffset = (d.getUTCDay() + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - mondayOffset);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: toIsoDate(monday), to: toIsoDate(sunday) };
}
