"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { StartableTask, TopicCoverage, PlanItemCoverage, PlanWeek, StudyPlan } from "@/lib/planner";
import { TaskRow } from "./TaskRow";
import { PlanCoverageList } from "./PlanCoverageList";
import { PlanItemCoverageList } from "./PlanItemCoverageList";
import { PlanWeekSquares } from "./PlanWeekSquares";
import { AddTaskButton } from "./AddTaskButton";
import { PlanScheduleSettings } from "./PlanScheduleSettings";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Tab = "overview" | "topics" | "schedule" | "settings";

// PLANNER-SPEC.md: "Overview · Topics · Schedule · Settings" — each
// tab is real content already fetched by the page (no per-tab fetch),
// not a placeholder: Topics and Schedule are the same data Overview
// summarizes, just given the full width.
export function PlanTabs({
  planId,
  mode,
  studyDays,
  sessionMinutes,
  maxTasksPerDay,
  topics,
  itemCoverage,
  weeks,
  todayIso,
  tasks,
  allTasks,
  overdueCount,
  plans,
}: {
  planId: string;
  mode: StudyPlan["mode"];
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  topics: TopicCoverage[];
  itemCoverage: PlanItemCoverage[];
  weeks: PlanWeek[];
  todayIso: string;
  tasks: StartableTask[];
  // Every task in the plan, any state — "see everything" (direct
  // feedback), unlike `tasks` above which Schedule/Up next keep to
  // pending only. Only the coverage lists (Overview/Topics) use this.
  allTasks: StartableTask[];
  overdueCount: number;
  plans: StudyPlan[];
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  const studyDaysLabel = DAY_KEYS.filter((_, i) => studyDays.includes(i + 1))
    .map((key) => t(`weekDay_${key}`))
    .join(" · ");

  const contentCount = itemCoverage.length > 0 ? itemCoverage.length : topics.length;
  const TABS: { key: Tab; label: string }[] = [
    { key: "overview", label: t("planTabOverview") },
    { key: "topics", label: t("planTabTopics", { count: contentCount }) },
    { key: "schedule", label: t(mode === "scheduled" ? "planTabSchedule" : "planTabUpNext") },
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
            <div className="flex items-center justify-between">
              <SectionHeading title={t("planCoverageHeading")} subtitle={t("planCoverageSubtitle")} />
              <AddTaskButton planId={planId} plans={plans} />
            </div>
            {itemCoverage.length > 0 ? (
              <PlanItemCoverageList items={itemCoverage} tasks={allTasks} planId={planId} plans={plans} />
            ) : (
              <PlanCoverageList topics={topics} tasks={allTasks} planId={planId} plans={plans} />
            )}
          </div>
          <div className="flex-1 flex-col">
            {mode === "scheduled" && (
              <>
                <SectionHeading title={t("planWeeksHeading")} subtitle={t("planWeeksSubtitle")} />
                <PlanWeekSquares weeks={weeks} todayIso={todayIso} />
              </>
            )}
            <div className={mode === "scheduled" ? "mt-4 flex flex-col gap-3" : "flex flex-col gap-3"}>
              {settingsPreview}
              {fallBehindWarning}
            </div>
          </div>
        </div>
      )}

      {tab === "topics" && (
        <div>
          <div className="flex items-center justify-between">
            <SectionHeading title={t("planCoverageHeading")} subtitle={t("planCoverageSubtitle")} />
            <AddTaskButton planId={planId} plans={plans} />
          </div>
          {itemCoverage.length > 0 ? (
            <PlanItemCoverageList items={itemCoverage} tasks={allTasks} planId={planId} plans={plans} groupByType />
          ) : (
            <PlanCoverageList topics={topics} tasks={allTasks} planId={planId} plans={plans} groupByType />
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="flex flex-col gap-3">
          <PlanScheduleSettings planId={planId} studyDays={studyDays} sessionMinutes={sessionMinutes} maxTasksPerDay={maxTasksPerDay} />
          {tasks.length > 0 && (
            <div className="flex items-center justify-end">
              <AddTaskButton planId={planId} plans={plans} />
            </div>
          )}
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
              <p className="font-ui text-sm text-secondary">{t("planNoTasksYet")}</p>
              <AddTaskButton planId={planId} plans={plans} prominent />
            </div>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={task.id}
                id={task.id}
                type={task.type}
                title={task.title}
                estimateLabel={t("estimateMinutes", { minutes: task.estimateMinutes })}
                estimateMinutes={task.estimateMinutes}
                scheduledFor={task.scheduledFor}
                planId={task.planId}
                plans={plans}
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
