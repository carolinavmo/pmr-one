"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { deleteTaskAction } from "@/lib/actions/study-planner";
import type { StudyTask } from "@/lib/study-planner";

interface DeleteTaskButtonProps {
  task: StudyTask | null; // null = closed
  onClose: () => void;
}

// Controlled by the parent — TaskRow's own trash icon is the trigger
// (see onRequestDelete), this component is just the confirmation
// dialog. No slug-typing gate like DeleteDiseaseButton's — deleting a
// study task is low-stakes and trivially undoable by recreating it,
// unlike deleting a disease.
export function DeleteTaskButton({ task, onClose }: DeleteTaskButtonProps) {
  const t = useTranslations("studyPlanner");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!task) return null;

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteTaskAction(task!.id);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="delete-task-title" className="font-reading text-lg text-primary">
              {t("deleteTaskTitle", { title: task.title })}
            </h2>
            <p className="mt-1 font-ui text-sm text-secondary">{t("deleteTaskBody")}</p>
          </div>
        </div>

        {error && <p className="font-ui text-sm text-warning">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface-raised px-4 font-ui text-sm font-medium text-primary hover:bg-border/40"
          >
            {t("deleteTaskCancel")}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-warning px-4 font-ui text-sm font-medium text-white hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? t("deleteTaskDeleting") : t("deleteTaskConfirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
