"use client";

import { useLocale, useTranslations } from "next-intl";
import { STUDY_CATEGORY_MAP } from "@/lib/study-categories";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { formatDuration, formatRelativeDate } from "./format";
import type { StudyTask } from "@/lib/study-planner";

interface UpcomingTasksCardProps {
  tasks: StudyTask[];
  todayIso: string;
}

// "View all" (→ the Agenda view) is deferred — Agenda is Phase 2, so
// there's nowhere for it to link to yet.
export function UpcomingTasksCard({ tasks, todayIso }: UpcomingTasksCardProps) {
  const t = useTranslations("studyPlanner");
  const locale = useLocale();

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
      <h2 className="font-ui text-sm font-medium text-primary">{t("upcomingHeading")}</h2>
      {tasks.length === 0 ? (
        <p className="font-ui text-sm text-secondary">{t("upcomingEmpty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {tasks.map((task) => {
            const category = STUDY_CATEGORY_MAP[task.category];
            return (
              <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 flex-col gap-0.5">
                  {category && (
                    <span
                      className={`w-fit rounded-full px-2 py-0.5 font-ui text-[11px] font-medium ${CARD_COLOR_CHIP[category.color]}`}
                    >
                      {category.label}
                    </span>
                  )}
                  <span className="truncate font-ui text-sm font-medium text-primary">
                    {task.title}
                  </span>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className="font-ui text-xs text-secondary">
                    {formatRelativeDate(
                      task.scheduledDate,
                      todayIso,
                      locale,
                      t("today"),
                      t("tomorrow"),
                    )}
                  </span>
                  <span className="font-ui text-xs text-secondary">
                    {formatDuration(task.estimatedMinutes)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
