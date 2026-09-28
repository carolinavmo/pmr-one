"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { NewPlanDrawer, type EditablePlan } from "./NewPlanDrawer";

// "Any plan can be reshaped" (PLANNER-SPEC.md rule 4). Originally just
// the icon next to the plan's name — direct feedback was that an
// icon-only affordance wasn't actually easy to find, so this also
// renders as a real labeled button for the header's own action column;
// `labeled` switches which. Both open the same drawer.
export function EditPlanButton({ plan, labeled }: { plan: EditablePlan; labeled?: boolean }) {
  const t = useTranslations("studyPlanner");
  const [open, setOpen] = useState(false);

  return (
    <>
      {labeled ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {t("editPlan")}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("editPlan")}
          className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Pencil className="size-4" aria-hidden="true" />
        </button>
      )}
      {open && <NewPlanDrawer open onClose={() => setOpen(false)} editPlan={plan} />}
    </>
  );
}
