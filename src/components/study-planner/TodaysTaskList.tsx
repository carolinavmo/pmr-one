"use client";

import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { TaskRow } from "./TaskRow";
import { EmptyTodayState } from "./EmptyStates";
import type { StudyTask } from "@/lib/study-planner";

interface TodaysTaskListProps {
  selectedDate: string;
  todayIso: string;
  tasks: StudyTask[];
  onEdit: (task: StudyTask) => void;
  onRequestDelete: (task: StudyTask) => void;
  onAddTask: () => void;
}

export function TodaysTaskList({
  selectedDate,
  todayIso,
  tasks,
  onEdit,
  onRequestDelete,
  onAddTask,
}: TodaysTaskListProps) {
  const t = useTranslations("studyPlanner");
  const locale = useLocale();
  const isToday = selectedDate === todayIso;
  const completedCount = tasks.filter((task) => task.completed).length;

  const heading = isToday
    ? t("todaysTasksHeading")
    : new Intl.DateTimeFormat(locale, { month: "long", day: "numeric" }).format(
        new Date(`${selectedDate}T00:00:00Z`),
      );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-base font-semibold text-primary capitalize">
            {heading}
          </h2>
          <span className="rounded-full bg-border/50 px-2 py-0.5 font-ui text-xs font-medium text-secondary">
            {tasks.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddTask}
          className="inline-flex items-center gap-1 font-ui text-sm font-medium text-accent hover:underline"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("newTaskCta")}
        </button>
      </div>

      {tasks.length === 0 ? (
        <EmptyTodayState onAddTask={onAddTask} />
      ) : (
        <>
          <div className="flex flex-col divide-y divide-border">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={onEdit}
                onRequestDelete={onRequestDelete}
              />
            ))}
          </div>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/50">
              <div
                className="h-full rounded-full bg-accent transition-all duration-base"
                style={{ width: `${tasks.length ? (completedCount / tasks.length) * 100 : 0}%` }}
              />
            </div>
            <span className="shrink-0 font-ui text-xs text-secondary">
              {t("completedOf", { completed: completedCount, total: tasks.length })}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
