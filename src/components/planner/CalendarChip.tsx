"use client";

import { useTranslations } from "next-intl";
import type { TaskType, TaskState } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_ACCENT, type QbankFolderColor } from "@/lib/qbank-folder-colors";

// PLANNER-SPEC.md: "Colour = the plan. Type and size in the label."
// The mockup's label shows a stored count ("Cards · 20") that this
// schema never keeps on the task row itself (only estimate_minutes,
// computed once at generation time) — title stands in for "size"
// instead, which is what every other planner surface (TaskRow,
// PlannerTodayPanel) already shows. A one-off task (no plan) falls
// back to a neutral border tint, same as TaskRow's own 'custom' tag.
export function CalendarChip({
  type,
  title,
  state,
  overdue,
  planColourKey,
  onPointerDown,
  dragging,
}: {
  type: TaskType;
  title: string;
  state: TaskState;
  overdue: boolean;
  planColourKey: QbankFolderColor | null;
  onPointerDown?: (e: React.PointerEvent) => void;
  dragging?: boolean;
}) {
  const t = useTranslations("studyPlanner");
  const done = state === "done";

  const bg = overdue ? "var(--color-warning-bg)" : planColourKey ? QBANK_FOLDER_COLOR_TINT[planColourKey] : "var(--color-border)";
  const fg = overdue ? "var(--color-warning)" : planColourKey ? QBANK_FOLDER_COLOR_ACCENT[planColourKey] : "var(--color-text-secondary)";

  return (
    <div
      onPointerDown={!done ? onPointerDown : undefined}
      className={`flex items-center gap-1 rounded-md px-1.5 py-1 font-ui text-[10.5px] leading-tight font-bold ${done ? "opacity-55 line-through" : ""} ${
        !done ? "cursor-grab active:cursor-grabbing" : ""
      } ${dragging ? "opacity-40" : ""}`}
      style={{ backgroundColor: bg, color: fg }}
    >
      <span className="size-1.5 shrink-0 rounded-[2px]" style={{ backgroundColor: fg }} aria-hidden="true" />
      <span className="min-w-0 truncate">
        {overdue ? t("typeOverdue") : t(`type_${type}`)} · {title}
      </span>
    </div>
  );
}
