"use client";

import { useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Play } from "lucide-react";
import type { StartableTask } from "@/lib/planner";
import { TaskRow } from "./TaskRow";

// The navy panel (PLANNER-SPEC.md: "count and estimated time, one
// line of context, ▶ Start today's plan, and the task list") — the
// page's own headline, not the month grid it replaces. "Start today's
// plan" starts the first not-yet-done task in the list; there's
// nothing to reschedule-in-bulk yet in Pass 1 (a real Reschedule flow
// needs the calendar's day panel, Pass 3), so that secondary action
// isn't shown until it would do something real.
export function PlannerTodayPanel({ tasks }: { tasks: StartableTask[] }) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();
  const [localTasks, setLocalTasks] = useState(tasks);

  const pending = localTasks.filter((task) => task.state !== "done");
  const overdueCount = pending.filter((task) => task.originalDate !== null).length;
  const totalMinutes = pending.reduce((sum, task) => sum + task.estimateMinutes, 0);
  const firstStartable = pending.find((task) => task.startHref);

  function handleToggled(taskId: string, done: boolean) {
    setLocalTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, state: done ? "done" : "pending" } : task)));
  }

  function handleDeleted(taskId: string) {
    setLocalTasks((prev) => prev.filter((task) => task.id !== taskId));
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-[11px] font-black tracking-[1.6px] text-[#7FCBD1] uppercase">{t("todayHeading")}</span>
          <span className="font-heading text-[27px] leading-none font-black text-white">
            {pending.length > 0 ? t("todayHeadlineCount", { count: pending.length, minutes: totalMinutes }) : t("todayHeadlineEmpty")}
          </span>
          {overdueCount > 0 ? (
            <span className="mt-1 font-ui text-[13.5px] text-white/70">{t("todayContextOverdue", { count: overdueCount })}</span>
          ) : pending.length > 0 ? (
            <span className="mt-1 font-ui text-[13.5px] text-white/70">{t("todayContextPlain", { count: pending.length })}</span>
          ) : null}
        </div>

        {firstStartable?.startHref && (
          <a
            href={firstStartable.startHref}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 font-ui text-sm font-bold text-navy hover:bg-white/90"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {t("startTodaysPlan")}
          </a>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {localTasks.length === 0 ? (
          <p className="font-ui text-sm text-white/60">{t("todaysTasksEmptyBody")}</p>
        ) : (
          localTasks.map((task) => (
            <TaskRow
              key={task.id}
              id={task.id}
              type={task.type}
              title={task.title}
              estimateLabel={
                task.state !== "done" && task.originalDate
                  ? t("fromOriginalDate", { day: format.dateTime(new Date(`${task.originalDate}T00:00:00Z`), { weekday: "long" }) })
                  : t("estimateMinutes", { minutes: task.estimateMinutes })
              }
              state={task.state}
              startHref={task.startHref}
              overdue={task.originalDate !== null && task.state !== "done"}
              dark
              onToggled={(done) => handleToggled(task.id, done)}
              onDeleted={() => handleDeleted(task.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
