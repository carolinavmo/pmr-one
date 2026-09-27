"use client";

import { useTranslations, useFormatter } from "next-intl";
import type { PlanWeek } from "@/lib/planner";

function weekEndIso(startIso: string): string {
  const d = new Date(`${startIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 6);
  return d.toISOString().slice(0, 10);
}

// PLANNER-SPEC.md: "one row per week, one square per task: done green,
// missed red, planned grey" — squares come from getPlanWeeks, which
// already bucketed each task into the week it was actually due (see
// that function's own comment on why a rolled-forward task can't use
// its current scheduled_for for this).
export function PlanWeekSquares({ weeks, todayIso }: { weeks: PlanWeek[]; todayIso: string }) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();

  function isCurrentWeek(startIso: string): boolean {
    return startIso <= todayIso && todayIso <= weekEndIso(startIso);
  }
  function statusLabel(week: PlanWeek): string {
    if (isCurrentWeek(week.weekStartIso)) return t("planWeekThisWeek");
    const missed = week.squares.filter((s) => s === "missed").length;
    const planned = week.squares.filter((s) => s === "planned").length;
    if (missed > 0) return t("planWeekMissedCount", { count: missed });
    if (planned === 0) return t("planWeekAllDone");
    return t("planWeekPlannedCount", { count: planned });
  }

  if (weeks.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center font-ui text-sm text-secondary">{t("planNoTasksYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {weeks.map((week) => (
        <div
          key={week.weekStartIso}
          className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${isCurrentWeek(week.weekStartIso) ? "border-2 border-navy" : "border-border"}`}
        >
          <span className="w-[104px] shrink-0 font-ui text-xs font-black text-navy">
            {format.dateTime(new Date(`${week.weekStartIso}T00:00:00Z`), { month: "short", day: "numeric" })} –{" "}
            {(() => {
              const start = new Date(`${week.weekStartIso}T00:00:00Z`);
              const end = new Date(`${weekEndIso(week.weekStartIso)}T00:00:00Z`);
              // Same Intl quirk PlannerCalendar.tsx works around: { day,
              // year } with no month collapses to "2026 (day: 27)" — a
              // cross-month week needs the month spelled out on the end
              // day too, not just a bare day number.
              return start.getUTCMonth() === end.getUTCMonth()
                ? format.dateTime(end, { day: "numeric" })
                : format.dateTime(end, { month: "short", day: "numeric" });
            })()}
          </span>
          <div className="flex flex-1 flex-wrap gap-1">
            {week.squares.map((state, i) => (
              <span
                key={i}
                className="size-4 shrink-0 rounded-[5px]"
                style={{ backgroundColor: state === "done" ? "var(--color-trust)" : state === "missed" ? "var(--color-warning)" : "var(--color-border)" }}
              />
            ))}
          </div>
          <span className="w-20 shrink-0 text-right font-ui text-[11px] font-bold text-secondary">{statusLabel(week)}</span>
        </div>
      ))}
    </div>
  );
}
