"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { WeekDaySummary } from "@/lib/planner";

const DAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// "Seven day cards: done, missed, planned, today outlined, rest days
// named" (PLANNER-SPEC.md) — a rest day says so rather than sitting
// blank (rule 5), and a day with any missed task reads "N missed"
// even if it also has done ones, since that's the one worth noticing.
// PLANNER-IMPLEMENTATION.md Pass 5: "week strip scrolls" on mobile —
// fixed-width cards in a horizontally-scrolling row below `sm`, back
// to the original equal-width fill at `sm` and up (see each card's own
// `sm:` overrides). Scrolled to today on mount so a Thursday visit
// doesn't open on a strip showing Monday with today off-screen.
export function WeekStrip({ days, todayIso }: { days: WeekDaySummary[]; todayIso: string }) {
  const t = useTranslations("studyPlanner");
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    todayRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1">
      {days.map((day, i) => {
        const isToday = day.date === todayIso;
        const dayNum = Number(day.date.slice(8, 10));
        const isDone = day.doneCount > 0 && day.missedCount === 0 && day.plannedCount === 0;
        let label: string;
        if (day.isRestDay) label = t("weekRestDay");
        else if (day.missedCount > 0) label = t("weekMissedCount", { count: day.missedCount });
        else if (isToday) label = t("weekTodayCount", { count: day.doneCount + day.plannedCount });
        else if (day.doneCount > 0) label = t("weekDoneCount", { count: day.doneCount });
        else if (day.plannedCount > 0) label = t("weekPlannedCount", { count: day.plannedCount });
        else label = "";

        return (
          <div
            key={day.date}
            ref={isToday ? todayRef : undefined}
            className={`flex w-[100px] shrink-0 flex-col items-center gap-2 rounded-2xl border-2 px-2.5 py-3 text-center sm:w-auto sm:flex-1 sm:shrink ${
              isToday ? "border-navy bg-soft" : isDone ? "border-trust/30 bg-trust/5" : "border-border"
            }`}
          >
            <span className={`font-ui text-[11px] font-black tracking-[1.2px] uppercase ${isToday ? "text-navy" : "text-secondary"}`}>{t(`weekDay_${DAY_LABELS[i]}`)}</span>
            <span className="font-heading text-lg font-black text-primary">{dayNum}</span>
            <div className="flex min-h-[10px] items-end justify-center gap-[3px]">
              {Array.from({ length: Math.min(3, day.doneCount + day.plannedCount + day.missedCount) }).map((_, dotIndex) => (
                <span
                  key={dotIndex}
                  className={`size-1.5 rounded-full ${
                    dotIndex < day.doneCount ? "bg-trust" : dotIndex < day.doneCount + day.missedCount ? "bg-warning" : "bg-border"
                  }`}
                />
              ))}
            </div>
            <span className="font-ui text-[10.5px] font-bold text-secondary">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
