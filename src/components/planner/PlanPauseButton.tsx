"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pause, Play } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setPlanStatusAction } from "@/lib/actions/planner";
import type { PlanStatus } from "@/lib/planner";

// "Any plan can be reshaped — pace, topics, pause" (PLANNER-SPEC.md
// rule 4). Pausing stops a plan generating/showing future tasks
// (getPlans("active") and the rail both already filter by status)
// without deleting anything already scheduled.
export function PlanPauseButton({ planId, status }: { planId: string; status: PlanStatus }) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const paused = status === "paused";

  function handleClick() {
    startTransition(async () => {
      await setPlanStatusAction(planId, paused ? "active" : "paused");
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30 disabled:opacity-60"
    >
      {paused ? <Play className="size-3.5" aria-hidden="true" /> : <Pause className="size-3.5" aria-hidden="true" />}
      {paused ? t("planResume") : t("planPause")}
    </button>
  );
}
