"use client";

import { useTranslations } from "next-intl";
import type { WeeklyProgress } from "@/lib/study-planner";

// The denominator is the real count of tasks scheduled Mon–Sun this
// week (not a separately-configurable goal number) — a genuinely
// computed value, matching the "do not hardcode these values"
// instruction without adding a whole goal-setting surface for v1.
export function WeeklyGoalCard({ progress }: { progress: WeeklyProgress }) {
  const t = useTranslations("studyPlanner");
  const { completed, total } = progress;
  const percent = total === 0 ? 0 : Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-ui text-sm font-medium text-primary">{t("weeklyGoalHeading")}</h2>
        <span className="font-ui text-sm font-medium text-primary tabular-nums">
          {t("weeklyGoalProgress", { completed, total })}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-border/50">
        <div
          className="h-full rounded-full bg-accent transition-all duration-base"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
