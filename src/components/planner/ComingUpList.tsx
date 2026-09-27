"use client";

import { useTranslations, useFormatter } from "next-intl";
import type { StartableTask } from "@/lib/planner";

// "The next seven days as rows, each tagged and dated" (PLANNER-SPEC.md)
// — read-only aside from the Start link (no checkbox here; a task
// this far out isn't something you'd mark done ahead of time).
export function ComingUpList({ tasks, todayIso }: { tasks: StartableTask[]; todayIso: string }) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();
  const tomorrow = new Date(`${todayIso}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
          <span className="w-2" aria-hidden="true" />
          <span className={`shrink-0 rounded-md px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] uppercase bg-border/40 text-secondary`}>
            {t(`type_${task.type}`)}
          </span>
          <span className="min-w-0 flex-1 truncate font-ui text-sm font-extrabold text-primary">{task.title}</span>
          <span className="shrink-0 font-ui text-xs font-bold text-secondary">{task.planName ?? t("oneOffTask")}</span>
          <span className="shrink-0 font-ui text-xs font-black text-secondary">
            {task.scheduledFor === tomorrowIso
              ? t("tomorrow")
              : format.dateTime(new Date(`${task.scheduledFor}T00:00:00Z`), { weekday: "long" })}
          </span>
        </div>
      ))}
    </div>
  );
}
