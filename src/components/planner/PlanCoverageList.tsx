"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { TopicCoverage, StartableTask, StudyPlan } from "@/lib/planner";
import { TaskRow } from "./TaskRow";
import { AddTaskButton } from "./AddTaskButton";

// PLANNER-SPEC.md rule 3, "Coverage beats completion" — 62% overall
// can hide a topic that hasn't started; these bars are the point. A
// topic with zero generated tasks (its subject had no content when
// the plan was made — see generateTasksForPlan's own withContent filter)
// reads as "no content yet", distinct from "not started" (it has
// tasks, none done yet), so the two very different gaps aren't
// conflated.
//
// Each row expands in place to that topic's own tasks — "see
// everything, edit directly" (direct feedback) rather than sending the
// reader to the flat Schedule tab to find one topic's work. Reuses
// TaskRow/AddTaskButton exactly as Schedule does, just pre-filtered to
// this topic's task_id and pre-scoped so a task added from here is
// attributed to it from the start.
export function PlanCoverageList({ topics, tasks, planId, plans }: { topics: TopicCoverage[]; tasks: StartableTask[]; planId: string; plans: StudyPlan[] }) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  if (topics.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center font-ui text-sm text-secondary">{t("planNoTopicsYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {topics.map((topic) => {
        const percent = topic.taskCount === 0 ? 0 : Math.round((topic.doneCount / topic.taskCount) * 100);
        const barColor = percent >= 66 ? "var(--color-trust)" : percent >= 33 ? "var(--color-insight)" : "var(--color-warning)";
        const open = openId === topic.id;
        const topicTasks = tasks.filter((task) => task.topicId === topic.id);
        return (
          <div key={topic.id} className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : topic.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
            >
              <ChevronDown className={`size-3.5 shrink-0 text-secondary transition-transform duration-base ${open ? "rotate-0" : "-rotate-90"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className="block truncate font-ui text-sm font-black text-navy">{topic.label}</span>
                <span className="font-ui text-xs font-bold text-secondary">{t("planTopicTaskCount", { count: topic.taskCount })}</span>
              </div>
              <div className="h-2 w-[100px] shrink-0 overflow-hidden rounded-full bg-border/40">
                {topic.taskCount > 0 && <span className="block h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />}
              </div>
              <span className="w-[88px] shrink-0 text-right font-ui text-xs font-black" style={{ color: topic.taskCount === 0 ? "var(--color-text-secondary)" : barColor }}>
                {topic.taskCount === 0 ? t("planTopicNoContent") : percent === 0 ? t("planTopicNotStarted") : `${percent}%`}
              </span>
            </button>
            {open && (
              <div className="flex flex-col gap-2 border-t border-border p-3">
                {topicTasks.map((task) => (
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
                    onDeleted={() => router.refresh()}
                  />
                ))}
                {topicTasks.length === 0 && <p className="py-1 text-center font-ui text-xs text-secondary">{t("planNoTasksYet")}</p>}
                <div className="flex justify-end">
                  <AddTaskButton planId={planId} plans={plans} initialTopicId={topic.id} compact />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
