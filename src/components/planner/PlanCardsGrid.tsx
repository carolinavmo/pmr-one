"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { StudyPlan } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { NewPlanDrawer } from "./NewPlanDrawer";

// Pastel plan cards (PLANNER-SPEC.md: "name, deadline, progress bar,
// on-track state") plus a dashed "New plan" ghost card — the plan
// palette reuses QbankFolderColor rather than inventing a second
// pastel system, since the two already read as the same family
// (peach/lilac/mint/sky match QBANK_FOLDER_COLOR_ACCENT exactly).
// On-track math (ahead/behind by N tasks) is Pass 4 scope (it needs
// the plan's own pacing history) — Pass 1 shows plain completion.
export function PlanCardsGrid({ plans }: { plans: StudyPlan[] }) {
  const t = useTranslations("studyPlanner");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {plans.map((plan) => {
        const percent = plan.tasksTotal === 0 ? 0 : Math.round((plan.tasksDone / plan.tasksTotal) * 100);
        return (
          <Link
            key={plan.id}
            href={`/study-planner/plan/${plan.id}`}
            className="flex flex-col rounded-[18px] p-[18px] pb-4 transition-shadow duration-base hover:shadow-[0_8px_20px_rgba(20,40,74,0.10)]"
            style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[plan.colourKey] }}
          >
            <span className="font-heading text-lg leading-tight font-black text-navy">{plan.name}</span>
            <span className="mt-1 font-ui text-[12.5px] font-bold text-secondary/90">
              {plan.targetDate ? t("planCardDeadline", { date: plan.targetDate }) : t(`planKind_${plan.kind}`)}
            </span>
            <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-navy/[0.08]">
              <span className="block h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] }} />
            </div>
            <div className="mt-2 flex items-center">
              <span className="font-ui text-xs font-black" style={{ color: QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] }}>
                {t("planCardPercent", { percent })}
              </span>
              <span className="ml-auto font-ui text-xs font-black text-navy">{t("openPlan")} ›</span>
            </div>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="flex min-h-[130px] flex-col items-center justify-center gap-1 rounded-[18px] border-2 border-dashed border-border text-secondary hover:border-accent/40 hover:text-accent"
      >
        <Plus className="size-6" aria-hidden="true" />
        <span className="font-heading text-[15px] font-black">{t("newPlanCta")}</span>
        <span className="px-3.5 text-center font-ui text-xs text-secondary">{t("newPlanCardSubtitle")}</span>
      </button>

      <NewPlanDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
