"use client";

import { useState, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Trash2, Pencil } from "lucide-react";
import type { StartableTask, StudyPlan } from "@/lib/planner";
import { deleteTaskAction } from "@/lib/actions/planner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { NewTaskDrawer } from "./NewTaskDrawer";

// "The next seven days as rows, each tagged and dated" (PLANNER-SPEC.md)
// — read-only aside from the Start link (no checkbox here; a task
// this far out isn't something you'd mark done ahead of time), edit
// and delete, which every surface showing a task offers regardless of
// how far out it is. Deletions are tracked as an override set applied
// over the `tasks` prop at render time (not mirrored into local
// state) so an edit — which can reschedule a task off "next 7 days"
// entirely — is picked up correctly once NewTaskDrawer's own
// router.refresh() delivers fresh props, rather than going stale
// behind a one-time local copy.
export function ComingUpList({ tasks, todayIso, plans }: { tasks: StartableTask[]; todayIso: string; plans: StudyPlan[] }) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();
  const [isPending, startTransition] = useTransition();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const tomorrow = new Date(`${todayIso}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowIso = tomorrow.toISOString().slice(0, 10);

  const localTasks = tasks.filter((task) => !deletedIds.has(task.id));
  const editingTask = localTasks.find((task) => task.id === editingId) ?? null;

  function handleDelete(taskId: string) {
    setConfirmingId(null);
    startTransition(async () => {
      await deleteTaskAction(taskId);
      setDeletedIds((prev) => new Set(prev).add(taskId));
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {localTasks.map((task) => (
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
          <button
            type="button"
            onClick={() => setEditingId(task.id)}
            disabled={isPending}
            aria-label={t("editTask")}
            className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingId(task.id)}
            disabled={isPending}
            aria-label={t("deleteTask")}
            className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-card-red"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
      {confirmingId && (
        <ConfirmDialog
          title={t("confirmDeleteTask")}
          confirmLabel={t("deleteTask")}
          cancelLabel={t("cancel")}
          onConfirm={() => handleDelete(confirmingId)}
          onCancel={() => setConfirmingId(null)}
        />
      )}
      {editingTask && (
        <NewTaskDrawer
          open
          onClose={() => setEditingId(null)}
          plans={plans}
          editTask={{
            id: editingTask.id,
            type: editingTask.type,
            title: editingTask.title,
            estimateMinutes: editingTask.estimateMinutes,
            scheduledFor: editingTask.scheduledFor,
            planId: editingTask.planId,
          }}
        />
      )}
    </div>
  );
}
