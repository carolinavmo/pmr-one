"use client";

import { useTranslations } from "next-intl";
import { Check, Clock, Pencil, Trash2 } from "lucide-react";
import { toggleTaskCompleteAction } from "@/lib/actions/study-planner";
import { STUDY_CATEGORY_MAP } from "@/lib/study-categories";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { formatDuration, priorityTextClass } from "./format";
import { LinkedContentBreadcrumb } from "./LinkedContentBreadcrumb";
import type { StudyTask } from "@/lib/study-planner";

interface TaskRowProps {
  task: StudyTask;
  onEdit: (task: StudyTask) => void;
  onRequestDelete: (task: StudyTask) => void;
}

export function TaskRow({ task, onEdit, onRequestDelete }: TaskRowProps) {
  const t = useTranslations("studyPlanner");
  const category = STUDY_CATEGORY_MAP[task.category];

  return (
    <div className="flex items-center gap-3 py-2.5">
      <button
        type="button"
        onClick={() => toggleTaskCompleteAction(task.id)}
        aria-pressed={task.completed}
        aria-label={task.completed ? t("markIncomplete") : t("markComplete")}
        className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-base ${
          task.completed
            ? "border-trust bg-trust text-white"
            : "border-border text-transparent hover:border-accent"
        }`}
      >
        <Check className="size-3" aria-hidden="true" />
      </button>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span
          className={`truncate font-ui text-sm font-medium ${
            task.completed ? "text-secondary line-through" : "text-primary"
          }`}
        >
          {task.title}
        </span>
        <span className="flex flex-wrap items-center gap-2 font-ui text-xs text-secondary">
          {category && (
            <span
              className={`rounded-full px-2 py-0.5 font-medium ${CARD_COLOR_CHIP[category.color]}`}
            >
              {category.label}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden="true" />
            {formatDuration(task.estimatedMinutes)}
          </span>
          <span className={`font-medium ${priorityTextClass(task.priority)}`}>
            {t(`priority${task.priority[0].toUpperCase()}${task.priority.slice(1)}` as "priorityLow")}
          </span>
          <LinkedContentBreadcrumb task={task} />
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={t("editTask")}
          className="flex size-8 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onRequestDelete(task)}
          aria-label={t("deleteTask")}
          className="flex size-8 items-center justify-center rounded-full text-secondary hover:bg-warning/10 hover:text-warning"
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
