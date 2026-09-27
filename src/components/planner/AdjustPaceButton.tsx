"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Gauge } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { adjustPlanPaceAction } from "@/lib/actions/planner";

// PLANNER-IMPLEMENTATION.md Pass 4: "Adjust the pace re-spreads only
// pending tasks" — re-times the plan's existing pending tasks across
// the weeks left rather than picking new content (RegeneratePlanButton's
// job). `prominent` switches between the header's own secondary-action
// styling and the fall-behind warning's own inline CTA styling — same
// action, two entry points (PlanHeader.tsx surfaces both once overdue
// passes five, per the spec's own "offers to re-spread" rule).
export function AdjustPaceButton({ planId, prominent }: { planId: string; prominent?: boolean }) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const adjusted = await adjustPlanPaceAction(planId);
      setResult({ created: adjusted.created });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          prominent
            ? "flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 font-ui text-xs font-bold text-white hover:bg-navy/90 disabled:opacity-60"
            : "flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30 disabled:opacity-60"
        }
      >
        <Gauge className={`size-3.5 ${isPending ? "animate-pulse" : ""}`} aria-hidden="true" />
        {t("planAdjustPace")}
      </button>
      {result && <span className="font-ui text-xs text-secondary">{t("planAdjustPaceResult", { count: result.created })}</span>}
    </div>
  );
}
