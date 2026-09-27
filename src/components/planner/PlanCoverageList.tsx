"use client";

import { useTranslations } from "next-intl";
import type { TopicCoverage } from "@/lib/planner";

// PLANNER-SPEC.md rule 3, "Coverage beats completion" — 62% overall
// can hide a topic that hasn't started; these bars are the point. A
// topic with zero generated tasks (its subject had no content when
// the plan was made — see generateTasksForPlan's withContent filter)
// reads as "no content yet", distinct from "not started" (it has
// tasks, none done yet), so the two very different gaps aren't
// conflated.
export function PlanCoverageList({ topics }: { topics: TopicCoverage[] }) {
  const t = useTranslations("studyPlanner");

  if (topics.length === 0) {
    return <p className="rounded-xl border border-dashed border-border p-4 text-center font-ui text-sm text-secondary">{t("planNoTopicsYet")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {topics.map((topic) => {
        const percent = topic.taskCount === 0 ? 0 : Math.round((topic.doneCount / topic.taskCount) * 100);
        const barColor = percent >= 66 ? "var(--color-trust)" : percent >= 33 ? "var(--color-insight)" : "var(--color-warning)";
        return (
          <div key={topic.id} className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <span className="block truncate font-ui text-sm font-black text-navy">{topic.label}</span>
              <span className="font-ui text-xs font-bold text-secondary">{t("planTopicTaskCount", { count: topic.taskCount })}</span>
            </div>
            <div className="h-2 w-[100px] shrink-0 overflow-hidden rounded-full bg-border/40">
              {topic.taskCount > 0 && <span className="block h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: barColor }} />}
            </div>
            <span className="w-[88px] shrink-0 text-right font-ui text-xs font-black" style={{ color: topic.taskCount === 0 ? "var(--color-text-secondary)" : barColor }}>
              {topic.taskCount === 0 ? t("planTopicNoContent") : percent === 0 ? t("planTopicNotStarted") : `${percent}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}
