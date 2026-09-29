"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { TopicCoverage, StartableTask, StudyPlan, TaskType } from "@/lib/planner";
import { TaskRow } from "./TaskRow";
import { AddTaskButton } from "./AddTaskButton";

// Reading order for a topic's own task-type groups — matches the
// generator's own read → flashcards → questions cycle, course/custom
// tacked on after since neither is ever generator output.
const TYPE_ORDER: TaskType[] = ["read", "flashcards", "questions", "course", "custom"];

// A synthetic id no real study_plan_topic row can ever have (they're
// all real uuids) — marks the "not linked to a topic" bucket below
// without a second boolean threaded through every row.
const UNCATEGORIZED_ID = "__uncategorized__";

interface Row {
  id: string;
  label: string;
  taskCount: number;
  doneCount: number;
  tasks: StartableTask[];
}

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
//
// A task added through Overview/Topics' own unscoped "+ Add task"
// (or created before this plan had any topics at all) has no
// topic_id — without a row for that, it was created successfully but
// never appeared anywhere on this tab, reading as "adding a task
// doesn't update" even though it did. The "Not linked to a topic" row
// below is exactly that bucket, same shape as a real topic row.
export function PlanCoverageList({
  topics,
  tasks,
  planId,
  plans,
  groupByType,
}: {
  topics: TopicCoverage[];
  tasks: StartableTask[];
  planId: string;
  plans: StudyPlan[];
  // The Topics tab's own request (direct feedback) — split a topic's
  // tasks into read/flashcards/questions sections instead of one
  // mixed list. Overview keeps the flat list.
  groupByType?: boolean;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const uncategorizedTasks = tasks.filter((task) => task.topicId === null);
  const rows: Row[] = topics.map((topic) => ({
    id: topic.id,
    label: topic.label,
    taskCount: topic.taskCount,
    doneCount: topic.doneCount,
    tasks: tasks.filter((task) => task.topicId === topic.id),
  }));
  if (uncategorizedTasks.length > 0) {
    rows.push({
      id: UNCATEGORIZED_ID,
      label: t("planUncategorizedTasks"),
      taskCount: uncategorizedTasks.length,
      doneCount: uncategorizedTasks.filter((task) => task.state === "done").length,
      tasks: uncategorizedTasks,
    });
  }

  if (rows.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center font-ui text-sm text-secondary">{t("planNoTopicsYet")}</p>;
  }

  const renderTask = (task: StartableTask) => (
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
  );

  return (
    <div className="flex flex-col gap-2">
      {rows.map((row) => {
        const percent = row.taskCount === 0 ? 0 : Math.round((row.doneCount / row.taskCount) * 100);
        const barColor = percent >= 66 ? "var(--color-trust)" : percent >= 33 ? "var(--color-insight)" : "var(--color-warning)";
        const open = openId === row.id;
        return (
          <div key={row.id} className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : row.id)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left"
            >
              <ChevronDown className={`size-3.5 shrink-0 text-secondary transition-transform duration-base ${open ? "rotate-0" : "-rotate-90"}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <span className={`block truncate font-ui text-sm font-black ${row.id === UNCATEGORIZED_ID ? "text-secondary italic" : "text-navy"}`}>{row.label}</span>
                <span className="font-ui text-xs font-bold text-secondary">{t("planTopicTaskCount", { count: row.taskCount })}</span>
              </div>
              <div className="h-2 w-[100px] shrink-0 overflow-hidden rounded-full bg-border/40">
                {row.taskCount > 0 && <span className="block h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />}
              </div>
              <span className="w-[88px] shrink-0 text-right font-ui text-xs font-black" style={{ color: row.taskCount === 0 ? "var(--color-text-secondary)" : barColor }}>
                {row.taskCount === 0 ? t("planTopicNoContent") : percent === 0 ? t("planTopicNotStarted") : `${percent}%`}
              </span>
            </button>
            {open && (
              <div className="flex flex-col gap-3 border-t border-border p-3">
                {groupByType
                  ? TYPE_ORDER.filter((type) => row.tasks.some((task) => task.type === type)).map((type) => (
                      <div key={type} className="flex flex-col gap-2">
                        <span className="font-ui text-[10px] font-black tracking-[1.2px] text-secondary uppercase">{t(`type_${type}`)}</span>
                        {row.tasks.filter((task) => task.type === type).map(renderTask)}
                      </div>
                    ))
                  : row.tasks.map(renderTask)}
                {row.tasks.length === 0 && <p className="py-1 text-center font-ui text-xs text-secondary">{t("planNoTasksYet")}</p>}
                <div className="flex justify-end">
                  <AddTaskButton planId={planId} plans={plans} initialTopicId={row.id === UNCATEGORIZED_ID ? undefined : row.id} compact />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
