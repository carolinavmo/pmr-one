"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { NewPlanDrawer, type EditablePlan } from "./NewPlanDrawer";

// "Any plan can be reshaped" (PLANNER-SPEC.md rule 4) — the pencil
// sits right next to the plan's own name on its detail page, same
// "edit lives beside the thing it edits" convention TaskRow already
// uses, rather than another item buried in the header's action column.
export function EditPlanButton({ plan }: { plan: EditablePlan }) {
  const t = useTranslations("studyPlanner");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("editPlan")}
        className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
      >
        <Pencil className="size-4" aria-hidden="true" />
      </button>
      {open && <NewPlanDrawer open onClose={() => setOpen(false)} editPlan={plan} />}
    </>
  );
}
