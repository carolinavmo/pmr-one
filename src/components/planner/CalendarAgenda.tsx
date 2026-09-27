"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { StartableTask } from "@/lib/planner";
import { TaskRow } from "./TaskRow";

// The third of the three views PLANNER-IMPLEMENTATION.md's Pass 3 asks
// for — a flat chronological list, skipping empty days entirely rather
// than rendering a header for every date in the window.
export function CalendarAgenda({
  dates,
  tasksByDate,
  onTaskDeleted,
}: {
  dates: string[];
  tasksByDate: Map<string, StartableTask[]>;
  onTaskDeleted: () => void;
}) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();
  const daysWithTasks = dates.filter((date) => (tasksByDate.get(date) ?? []).length > 0);

  if (daysWithTasks.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("calendarAgendaEmpty")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      {daysWithTasks.map((date) => {
        const dayTasks = tasksByDate.get(date) ?? [];
        return (
          <div key={date} className="flex flex-col gap-2">
            <h3 className="font-ui text-xs font-black tracking-[0.8px] text-secondary uppercase">
              {format.dateTime(new Date(`${date}T00:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}
            </h3>
            <div className="flex flex-col gap-2">
              {dayTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  id={task.id}
                  type={task.type}
                  title={task.title}
                  estimateLabel={t("estimateMinutes", { minutes: task.estimateMinutes })}
                  state={task.state}
                  startHref={task.startHref}
                  overdue={task.state !== "done" && task.originalDate !== null}
                  onDeleted={onTaskDeleted}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
