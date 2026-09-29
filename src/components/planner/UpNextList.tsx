"use client";

import type { StartableTask, StudyPlan } from "@/lib/planner";
import { useTranslations } from "next-intl";
import { TaskRow } from "./TaskRow";

// A flexible/target-mode plan's own queue, surfaced on Today
// (PLANNER-IMPLEMENTATION.md Pass 1: "Unscheduled tasks appear in an
// Up next section") — plain queue order (getQueueTasks' own
// queue_position), no date grouping, since these tasks have none.
export function UpNextList({ tasks, plans }: { tasks: StartableTask[]; plans: StudyPlan[] }) {
  const t = useTranslations("studyPlanner");
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskRow
          key={task.id}
          id={task.id}
          type={task.type}
          title={task.title}
          estimateLabel={t("estimateMinutes", { minutes: task.estimateMinutes })}
          estimateMinutes={task.estimateMinutes}
          scheduledFor={task.scheduledFor}
          planId={task.planId}
          plans={plans}
          state={task.state}
          startHref={task.startHref}
        />
      ))}
    </div>
  );
}
