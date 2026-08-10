"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createTaskAction, updateTaskAction } from "@/lib/actions/study-planner";
import { STUDY_CATEGORIES } from "@/lib/study-categories";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { Button } from "@/components/ui/Button";
import type { StudyTask, StudyTaskInput } from "@/lib/study-planner";

interface TaskFormDrawerProps {
  open: boolean;
  onClose: () => void;
  task: StudyTask | null; // null = create mode
  defaultDate: string;
}

const PRIORITIES: Array<StudyTaskInput["priority"]> = ["low", "medium", "high"];

function emptyInput(defaultDate: string): StudyTaskInput {
  return {
    title: "",
    notes: null,
    category: STUDY_CATEGORIES[0].key,
    scheduledDate: defaultDate,
    startTime: null,
    estimatedMinutes: 30,
    priority: "medium",
  };
}

function inputFromTask(task: StudyTask): StudyTaskInput {
  return {
    title: task.title,
    notes: task.notes,
    category: task.category,
    scheduledDate: task.scheduledDate,
    startTime: task.startTime,
    estimatedMinutes: task.estimatedMinutes,
    priority: task.priority,
  };
}

export function TaskFormDrawer({ open, onClose, task, defaultDate }: TaskFormDrawerProps) {
  const t = useTranslations("studyPlanner");
  const [form, setForm] = useState<StudyTaskInput>(() =>
    task ? inputFromTask(task) : emptyInput(defaultDate),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Reset the form whenever the drawer is (re)opened — for the same
  // task or a different one — discarding any unsaved edits from a
  // previous open. Adjusted during render (React's documented pattern
  // for resetting state on a prop change) rather than in a useEffect.
  const openKey = `${open}:${task?.id ?? "new"}`;
  const [prevOpenKey, setPrevOpenKey] = useState(openKey);
  if (openKey !== prevOpenKey) {
    setPrevOpenKey(openKey);
    setForm(task ? inputFromTask(task) : emptyInput(defaultDate));
    setError(null);
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = task
        ? await updateTaskAction(task.id, form)
        : await createTaskAction(form);
      if (result.ok) {
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={task ? t("taskFormEditTitle") : t("taskFormNewTitle")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">
            {task ? t("taskFormEditTitle") : t("taskFormNewTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("taskFormCancel")}
            className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskFormTitleLabel")}</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            autoFocus
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskFormCategoryLabel")}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {STUDY_CATEGORIES.map((category) => {
              const selected = form.category === category.key;
              const Icon = category.icon;
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, category: category.key }))}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 font-ui text-xs font-medium transition-colors duration-base ${
                    selected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-secondary hover:bg-border/40"
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[category.color]}`}
                  >
                    <Icon className="size-3" aria-hidden="true" />
                  </span>
                  <span className="truncate">{category.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("taskFormDateLabel")}</span>
            <input
              type="date"
              value={form.scheduledDate}
              onChange={(e) => setForm((prev) => ({ ...prev, scheduledDate: e.target.value }))}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">
              {t("taskFormTimeLabel")} <span className="text-secondary/70">({t("taskFormTimeOptional")})</span>
            </span>
            <input
              type="time"
              value={form.startTime ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value || null }))}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskFormDurationLabel")}</span>
          <input
            type="number"
            min={5}
            step={5}
            value={form.estimatedMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, estimatedMinutes: Number(e.target.value) }))}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskFormPriorityLabel")}</span>
          <div className="flex gap-1.5">
            {PRIORITIES.map((priority) => (
              <button
                key={priority}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, priority }))}
                className={`flex-1 rounded-full border px-3 py-1.5 font-ui text-xs font-medium capitalize transition-colors duration-base ${
                  form.priority === priority
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-secondary hover:bg-border/40"
                }`}
              >
                {t(`priority${priority[0].toUpperCase()}${priority.slice(1)}` as "priorityLow")}
              </button>
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskFormNotesLabel")}</span>
          <textarea
            value={form.notes ?? ""}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || null }))}
            rows={3}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        {error && <p className="font-ui text-sm text-warning">{error}</p>}

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("taskFormCancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending}>
            {isPending ? t("taskFormSaving") : t("taskFormSave")}
          </Button>
        </div>
      </aside>
    </>
  );
}
