"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { StartableTask, TopicCoverage, PlanWeek } from "@/lib/planner";
import { TaskRow } from "./TaskRow";
import { PlanCoverageList } from "./PlanCoverageList";
import { PlanWeekSquares } from "./PlanWeekSquares";
import { AdjustPaceButton } from "./AdjustPaceButton";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Tab = "overview" | "topics" | "schedule" | "settings";

// PLANNER-SPEC.md: "Overview · Topics · Schedule · Settings" — each
// tab is real content already fetched by the page (no per-tab fetch),
// not a placeholder: Topics and Schedule are the same data Overview
// summarizes, just given the full width.
export function PlanTabs({
  planId,
  studyDays,
  sessionMinutes,
  maxTasksPerDay,
  topics,
  weeks,
  todayIso,
  tasks,
  overdueCount,
}: {
  planId: string;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  topics: TopicCoverage[];
  weeks: PlanWeek[];
  todayIso: string;
  tasks: StartableTask[];
  overdueCount: number;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const studyDaysLabel = DAY_KEYS.filter((_, i) => studyDays.includes(i + 1))
    .map((key) => t(`weekDay_${key}`))
    .join(" · ");

  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: t("planTabOverview") },
    { key: "topics", label: t("planTabTopics", { count: topics.length }) },
    { key: "schedule", label: t("planTabSchedule") },
    { key: "settings", label: t("planTabSettings") },
  ];

  const settingsPreview = (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="flex-1 rounded-xl border border-border px-3.5 py-3">
        <span className="font-ui text-[10px] font-black tracking-[1.2px] text-secondary uppercase">{t("planStudyDaysLabel")}</span>
        <p className="mt-1 font-ui text-sm font-black text-navy">{studyDaysLabel || t("planNoStudyDays")}</p>
      </div>
      <div className="flex-1 rounded-xl border border-border px-3.5 py-3">
        <span className="font-ui text-[10px] font-black tracking-[1.2px] text-secondary uppercase">{t("planSessionLengthLabel")}</span>
        <p className="mt-1 font-ui text-sm font-black text-navy">{t("estimateMinutes", { minutes: sessionMinutes })}</p>
        <span className="font-ui text-xs text-secondary">{t("planAboutTasksADay", { count: maxTasksPerDay })}</span>
      </div>
    </div>
  );

  const fallBehindWarning = overdueCount > 0 && (
    <div className="flex flex-col gap-2 rounded-xl border-l-4 border-insight bg-insight/5 p-4">
      <div className="flex items-center gap-2 font-ui text-sm font-black text-insight">
        <AlertTriangle className="size-4" aria-hidden="true" />
        {t("planFallingBehindHeading")}
      </div>
      <p className="font-ui text-sm text-secondary">{t("planFallingBehindBody")}</p>
      {overdueCount > 5 && <AdjustPaceButton planId={planId} prominent />}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => setTab(tabDef.key)}
            className={`-mb-px border-b-[3px] px-3.5 py-2.5 font-ui text-sm font-bold ${
              tab === tabDef.key ? "border-accent text-navy" : "border-transparent text-secondary hover:text-navy"
            }`}
          >
            {tabDef.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1">
            <SectionHeading title={t("planCoverageHeading")} subtitle={t("planCoverageSubtitle")} />
            <PlanCoverageList topics={topics} />
          </div>
          <div className="flex-1 flex-col">
            <SectionHeading title={t("planWeeksHeading")} subtitle={t("planWeeksSubtitle")} />
            <PlanWeekSquares weeks={weeks} todayIso={todayIso} />
            <div className="mt-4 flex flex-col gap-3">
              {settingsPreview}
              {fallBehindWarning}
            </div>
          </div>
        </div>
      )}

      {tab === "topics" && (
        <div>
          <SectionHeading title={t("planCoverageHeading")} subtitle={t("planCoverageSubtitle")} />
          <PlanCoverageList topics={topics} />
        </div>
      )}

      {tab === "schedule" && (
        <div className="flex flex-col gap-2">
          {tasks.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("planNoTasksYet")}</p>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                id={task.id}
                type={task.type}
                title={task.title}
                estimateLabel={t("estimateMinutes", { minutes: task.estimateMinutes })}
                state={task.state}
                startHref={task.startHref}
                overdue={task.state !== "done" && task.originalDate !== null}
                onDeleted={() => router.refresh()}
              />
            ))
          )}
        </div>
      )}

      {tab === "settings" && <div className="max-w-md">{settingsPreview}</div>}
    </div>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-2.5 flex items-baseline gap-2">
      <h3 className="font-heading text-base font-black text-navy">{title}</h3>
      <span className="font-ui text-xs font-bold text-secondary">{subtitle}</span>
    </div>
  );
}
