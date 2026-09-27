"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Play, Plus } from "lucide-react";
import type { StartableTask, StudyPlan } from "@/lib/planner";
import { TaskRow } from "./TaskRow";

// PLANNER-SPEC.md: "Selecting a day fills the right-hand panel — never
// a modal." Reuses TaskRow (the exact same row the Today panel and
// Coming up already use) rather than a bespoke calendar row, so a task
// looks and behaves identically everywhere it appears.
export function CalendarDayPanel({
  date,
  tasks,
  plans,
  onAddTask,
  onTaskDeleted,
}: {
  date: string;
  tasks: StartableTask[];
  plans: StudyPlan[];
  onAddTask: () => void;
  onTaskDeleted: () => void;
}) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();

  const pending = tasks.filter((task) => task.state !== "done");
  const overdueCount = pending.filter((task) => task.originalDate !== null).length;
  const totalMinutes = pending.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const firstStartable = pending.find((task) => task.startHref);

  return (
    <div className="flex w-full shrink-0 flex-col gap-3 rounded-2xl border border-border p-4 lg:w-[300px]">
      <div className="flex flex-col gap-0.5">
        <span className="font-ui text-[10px] font-black tracking-[1.3px] text-secondary uppercase">{t("calendarSelectedDay")}</span>
        <h3 className="font-heading text-xl font-black text-navy">
          {format.dateTime(new Date(`${date}T00:00:00Z`), { weekday: "long", day: "numeric", month: "long" })}
        </h3>
        <span className="font-ui text-xs font-bold text-secondary">
          {t("calendarDaySummary", { count: tasks.length, minutes: totalMinutes })}
          {overdueCount > 0 ? ` · ${t("calendarDayOverdueCount", { count: overdueCount })}` : ""}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="font-ui text-sm text-secondary">{t("calendarNoTasksThisDay")}</p>
      ) : (
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
              overdue={task.state !== "done" && task.originalDate !== null}
              onDeleted={onTaskDeleted}
            />
          ))}
        </div>
      )}

      {firstStartable?.startHref && (
        <a
          href={firstStartable.startHref}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Play className="size-3.5" aria-hidden="true" />
          {t("calendarStartThisDay")}
        </a>
      )}
      <button
        type="button"
        onClick={onAddTask}
        className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-2.5 font-ui text-xs font-bold text-secondary hover:border-accent hover:text-accent"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {t("calendarAddTaskToDay")}
      </button>
    </div>
  );
}
