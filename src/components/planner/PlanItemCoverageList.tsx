"use client";

import { useTranslations } from "next-intl";
import type { PlanItemCoverage } from "@/lib/planner";

// The ordered-content model's own PlanCoverageList — same "coverage
// beats completion" bars, keyed by plan_item instead of the legacy
// study_plan_topic. Kept separate from PlanCoverageList rather than a
// shared generic component: the two shapes (weight vs. kind) only
// coincidentally look alike, and a plan is always fully on one model
// or the other, never both.
export function PlanItemCoverageList({ items }: { items: PlanItemCoverage[] }) {
  const t = useTranslations("studyPlanner");

  if (items.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center font-ui text-sm text-secondary">{t("planNoTopicsYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        const percent = item.taskCount === 0 ? 0 : Math.round((item.doneCount / item.taskCount) * 100);
        const barColor = percent >= 66 ? "var(--color-trust)" : percent >= 33 ? "var(--color-insight)" : "var(--color-warning)";
        return (
          <div key={item.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
            <span className="shrink-0 rounded-md bg-border/40 px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] text-secondary uppercase">
              {t(`planItemKind_${item.kind}`)}
            </span>
            <div className="min-w-0 flex-1">
              <span className="block truncate font-ui text-sm font-black text-navy">{item.label}</span>
              <span className="font-ui text-xs font-bold text-secondary">{t("planTopicTaskCount", { count: item.taskCount })}</span>
            </div>
            <div className="h-2 w-[100px] shrink-0 overflow-hidden rounded-full bg-border/40">
              {item.taskCount > 0 && <span className="block h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />}
            </div>
            <span className="w-[88px] shrink-0 text-right font-ui text-xs font-black" style={{ color: item.taskCount === 0 ? "var(--color-text-secondary)" : barColor }}>
              {item.taskCount === 0 ? t("planTopicNoContent") : percent === 0 ? t("planTopicNotStarted") : `${percent}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
