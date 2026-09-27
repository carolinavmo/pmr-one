"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GraduationCap, Stethoscope, Repeat, Plus } from "lucide-react";
import type { PlanKind } from "@/lib/planner";
import { NewPlanDrawer } from "./NewPlanDrawer";
import { NewTaskDrawer } from "./NewTaskDrawer";

// "No tasks and no plans: hide the metrics, the week strip and Coming
// up. Show one panel... with three starting points... and a fourth,
// quieter option to add a single task" (PLANNER-SPEC.md) — the whole
// first-visit page, never a zero-filled dashboard (rule 3).
export function PlannerEmptyState() {
  const t = useTranslations("studyPlanner");
  const [planKind, setPlanKind] = useState<PlanKind | null>(null);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-border bg-surface-raised px-8 py-14 text-center">
      <h2 className="font-heading text-2xl font-black text-primary">{t("emptyHeading")}</h2>
      <p className="max-w-md font-ui text-sm text-secondary">{t("emptyBody")}</p>

      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
        <EmptyStartCard icon={GraduationCap} label={t("emptyExamDate")} sub={t("emptyExamDateSub")} onClick={() => setPlanKind("exam")} />
        <EmptyStartCard icon={Stethoscope} label={t("emptyRotation")} sub={t("emptyRotationSub")} onClick={() => setPlanKind("rotation")} />
        <EmptyStartCard icon={Repeat} label={t("emptyRoutine")} sub={t("emptyRoutineSub")} onClick={() => setPlanKind("routine")} />
      </div>

      <button type="button" onClick={() => setTaskDrawerOpen(true)} className="flex items-center gap-1.5 font-ui text-sm font-bold text-secondary hover:text-accent">
        <Plus className="size-3.5" aria-hidden="true" />
        {t("emptyAddSingleTask")}
      </button>

      <NewPlanDrawer open={planKind !== null} onClose={() => setPlanKind(null)} initialKind={planKind ?? undefined} />
      <NewTaskDrawer open={taskDrawerOpen} onClose={() => setTaskDrawerOpen(false)} plans={[]} />
    </div>
  );
}

function EmptyStartCard({ icon: Icon, label, sub, onClick }: { icon: typeof GraduationCap; label: string; sub: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border bg-surface p-5 text-center hover:border-accent/40 hover:bg-accent/5"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="font-heading text-[15px] font-black text-primary">{label}</span>
      <span className="font-ui text-xs text-secondary">{sub}</span>
    </button>
  );
}
