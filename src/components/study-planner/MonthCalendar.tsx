"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  getMonthGridDays,
  getMonthTitle,
  getWeekdayLabels,
} from "./calendar-grid";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { STUDY_CATEGORY_MAP } from "@/lib/study-categories";
import type { StudyTask } from "@/lib/study-planner";

interface MonthCalendarProps {
  year: number;
  month: number; // 1-12
  todayIso: string;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  tasksByDate: Record<string, StudyTask[]>;
}

// Up to 3 dots per day, one per distinct category present that day —
// matches the reference mockup's per-day indicator dots.
function dotsForDay(tasks: StudyTask[] | undefined): string[] {
  if (!tasks || tasks.length === 0) return [];
  const categories = Array.from(new Set(tasks.map((t) => t.category)));
  return categories.slice(0, 3);
}

export function MonthCalendar({
  year,
  month,
  todayIso,
  selectedDate,
  onSelectDate,
  tasksByDate,
}: MonthCalendarProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("studyPlanner");

  const days = getMonthGridDays(year, month, todayIso);
  const weekdayLabels = getWeekdayLabels(locale);
  const title = getMonthTitle(locale, year, month);

  function goToMonth(delta: number) {
    const next = addMonths(year, month, delta);
    router.push(`/study-planner?month=${next.year}-${String(next.month).padStart(2, "0")}`);
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            aria-label={t("previousMonth")}
            className="flex size-8 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            aria-label={t("nextMonth")}
            className="flex size-8 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <h2 className="font-heading text-lg font-semibold text-primary capitalize">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-1 rounded-full border border-border p-1">
          <span className="rounded-full bg-accent px-3 py-1 font-ui text-xs font-medium text-white">
            {t("viewMonth")}
          </span>
          <span
            className="rounded-full px-3 py-1 font-ui text-xs text-secondary opacity-60"
            title={t("viewComingSoon")}
          >
            {t("viewWeek")}
          </span>
          <span
            className="rounded-full px-3 py-1 font-ui text-xs text-secondary opacity-60"
            title={t("viewComingSoon")}
          >
            {t("viewAgenda")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 font-ui text-xs font-medium text-secondary uppercase">
        {weekdayLabels.map((label) => (
          <div key={label} className="px-1 py-1 text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const isSelected = d.date === selectedDate;
          const dots = dotsForDay(tasksByDate[d.date]);
          return (
            <button
              key={d.date}
              type="button"
              onClick={() => onSelectDate(d.date)}
              className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-lg pt-1.5 font-ui text-sm transition-colors duration-base ${
                !d.isCurrentMonth ? "text-secondary/40" : "text-primary"
              } ${isSelected ? "bg-accent text-white" : d.isToday ? "bg-trust/10" : "hover:bg-border/40"}`}
            >
              <span className={isSelected ? "font-semibold" : ""}>{d.day}</span>
              {dots.length > 0 && (
                <span className="flex items-center gap-0.5">
                  {dots.map((categoryKey) => (
                    <span
                      key={categoryKey}
                      className={`size-1.5 rounded-full ${
                        isSelected
                          ? "bg-white"
                          : CARD_COLOR_SWATCH[STUDY_CATEGORY_MAP[categoryKey]?.color ?? "neutral"]
                      }`}
                    />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
