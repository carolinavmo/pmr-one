"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { regeneratePlanAction } from "@/lib/actions/planner";

// "Adjust the pace" (PLANNER-IMPLEMENTATION.md Pass 4) reduced to what
// Pass 2 actually has: re-run the same generator that ran at creation.
// Only ever replaces this plan's own pending tasks — nothing done is
// touched (see generateTasksForPlan's own comment) — so this is safe
// to press any time the plan's topics or pace stop matching reality.
export function RegeneratePlanButton({ planId }: { planId: string }) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ created: number } | null>(null);

  function handleClick() {
    startTransition(async () => {
      const generated = await regeneratePlanAction(planId);
      setResult({ created: generated.created });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30 disabled:opacity-60"
      >
        <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} aria-hidden="true" />
        {t("planRegenerateTasks")}
      </button>
      {result && <span className="font-ui text-xs text-secondary">{t("planRegenerateResult", { count: result.created })}</span>}
    </div>
  );
}
