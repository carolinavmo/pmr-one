"use client";

import { useLocale, useTranslations } from "next-intl";
import { Flame } from "lucide-react";
import { getWeekBounds } from "./calendar-grid";

interface StudyStreakCardProps {
  streak: number;
  todayIso: string;
  completedDaysThisWeek: string[]; // ISO dates within this week with >=1 completed task
}

// A single stat (StatTile's own shape would fit the number alone),
// but the spec also wants a week-of-dots visual — built as its own
// small card rather than stretching StatTile to do a job it wasn't
// designed for.
export function StudyStreakCard({
  streak,
  todayIso,
  completedDaysThisWeek,
}: StudyStreakCardProps) {
  const t = useTranslations("studyPlanner");
  const locale = useLocale();
  const completedSet = new Set(completedDaysThisWeek);

  const { from: monday } = getWeekBounds(todayIso);
  const mondayDate = new Date(`${monday}T00:00:00Z`);
  const dayFormatter = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mondayDate);
    d.setUTCDate(mondayDate.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);
    return { iso, label: dayFormatter.format(d), isToday: iso === todayIso };
  });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-insight/15 text-insight">
          <Flame className="size-4.5" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <span className="font-ui text-sm font-medium text-primary">{t("streakHeading")}</span>
          <span className="font-reading text-xl font-semibold text-primary tabular-nums">
            {t("streakCount", { count: streak })}
          </span>
        </div>
      </div>
      <p className="font-ui text-xs text-secondary">
        {streak > 0 ? t("streakKeepItUp") : t("streakEmpty")}
      </p>
      <div className="flex justify-between">
        {days.map((day) => (
          <div key={day.iso} className="flex flex-col items-center gap-1">
            <span
              className={`flex size-6 items-center justify-center rounded-full font-ui text-[10px] font-medium ${
                completedSet.has(day.iso)
                  ? "bg-insight text-white"
                  : day.isToday
                    ? "border border-insight/40 text-insight"
                    : "bg-border/40 text-secondary"
              }`}
            >
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
