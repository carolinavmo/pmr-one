"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { PlanItemCoverage, StartableTask, StudyPlan, TaskType, PlanItemKind } from "@/lib/planner";
import { TaskRow } from "./TaskRow";
import { AddTaskButton } from "./AddTaskButton";

// Reading order for an item's own task-type groups — matches the v2
// generator's own read → flashcards cycle within a folder; a
// page/deck/question_set plan_item only ever has one type anyway.
const TYPE_ORDER: TaskType[] = ["read", "flashcards", "questions", "course", "custom"];

// A synthetic id no real study_plan_item row can ever have (they're
// all real uuids) — marks the "not linked to an item" bucket below.
const UNCATEGORIZED_ID = "__uncategorized__";

interface Row {
  id: string;
  label: string;
  kind: PlanItemKind | null;
  taskCount: number;
  doneCount: number;
  tasks: StartableTask[];
}

// The ordered-content model's own PlanCoverageList — same "coverage
// beats completion" bars, keyed by plan_item instead of the legacy
// study_plan_topic. Kept separate from PlanCoverageList rather than a
// shared generic component: the two shapes (weight vs. kind) only
// coincidentally look alike, and a plan is always fully on one model
// or the other, never both. Same expand-in-place task list, filtered
// by plan_item_id instead of topic_id.
//
// A task added through Overview/Topics' own unscoped "+ Add task" has
// no plan_item_id — without a row for that, it was created
// successfully but never appeared anywhere here, reading as "adding a
// task doesn't update" even though it did. The "Not linked to an
// item" row below is exactly that bucket, same shape as a real one.
export function PlanItemCoverageList({
  items,
  tasks,
  planId,
  plans,
  groupByType,
}: {
  items: PlanItemCoverage[];
  tasks: StartableTask[];
  planId: string;
  plans: StudyPlan[];
  // The Topics tab's own request (direct feedback) — split an item's
  // tasks into read/flashcards/questions sections instead of one
  // mixed list. Overview keeps the flat list.
  groupByType?: boolean;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const uncategorizedTasks = tasks.filter((task) => task.planItemId === null);
  const rows: Row[] = items.map((item) => ({
    id: item.id,
    label: item.label,
    kind: item.kind,
    taskCount: item.taskCount,
    doneCount: item.doneCount,
    tasks: tasks.filter((task) => task.planItemId === item.id),
  }));
  if (uncategorizedTasks.length > 0) {
    rows.push({
      id: UNCATEGORIZED_ID,
      label: t("planUncategorizedTasks"),
      kind: null,
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
              {row.kind && (
                <span className="shrink-0 rounded-md bg-border/40 px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] text-secondary uppercase">
                  {t(`planItemKind_${row.kind}`)}
                </span>
              )}
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
                  <AddTaskButton planId={planId} plans={plans} initialPlanItemId={row.id === UNCATEGORIZED_ID ? undefined : row.id} compact />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
