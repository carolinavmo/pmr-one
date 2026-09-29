"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { StudyPlan } from "@/lib/planner";
import { NewTaskDrawer } from "./NewTaskDrawer";

// A real, labeled "+ Add task" button (not a bare icon) scoped to
// whichever plan renders it, per direct feedback that the sidebar's
// own generic "New task" — no visible connection to any one plan, and
// requiring the user to remember to pick it from a dropdown — wasn't
// reachable enough from a plan's own page. This is how "add this
// disease page / flashcard deck / question set to the plan" actually
// happens: the type picker inside NewTaskDrawer already searches all
// three, `initialPlanId` just means the plan is pre-selected instead
// of defaulting to one-off.
export function AddTaskButton({
  planId,
  plans,
  initialDate,
  initialTopicId,
  initialPlanItemId,
  prominent,
  compact,
}: {
  planId: string;
  plans: StudyPlan[];
  initialDate?: string;
  initialTopicId?: string;
  initialPlanItemId?: string;
  prominent?: boolean;
  // A small icon-only variant for a topic/folder row's own inline
  // "add task" affordance — that context is already labeled by the
  // row itself, so a full button would repeat "Add task" once per
  // topic on the page.
  compact?: boolean;
}) {
  const t = useTranslations("studyPlanner");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("addTaskCta")}
        className={
          compact
            ? "flex shrink-0 items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 font-ui text-xs font-bold text-secondary hover:border-accent hover:text-accent"
            : prominent
              ? "flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border px-3.5 py-3 font-ui text-sm font-bold text-secondary hover:border-accent hover:text-accent"
              : "flex items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30"
        }
      >
        <Plus className="size-3.5" aria-hidden="true" />
        {!compact && t("addTaskCta")}
      </button>
      {open && (
        <NewTaskDrawer
          open
          onClose={() => setOpen(false)}
          plans={plans}
          initialPlanId={planId}
          initialDate={initialDate}
          initialTopicId={initialTopicId}
          initialPlanItemId={initialPlanItemId}
        />
      )}
    </>
  );
}
