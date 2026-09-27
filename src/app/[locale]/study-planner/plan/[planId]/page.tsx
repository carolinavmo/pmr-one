import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect, Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { rollForwardMissedTasks, getPlanById, getTasksInRange, attachStartHrefs, getPlanStats, getPlanTopicCoverage, getPlanWeeks } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { RegeneratePlanButton } from "@/components/planner/RegeneratePlanButton";
import { AdjustPaceButton } from "@/components/planner/AdjustPaceButton";
import { PlanPauseButton } from "@/components/planner/PlanPauseButton";
import { PlanTabs } from "@/components/planner/PlanTabs";
import { Play } from "lucide-react";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// PLANNER-IMPLEMENTATION.md Pass 4 — "as in planner-plan.html": ring,
// deadline, on-track pill stated in tasks (not just a colour), four
// metrics, tabs, coverage by topic, the weeks, and the settings
// preview. Pass 1 shipped a bare ring/name/task-list version of this
// page; this replaces it wholesale.
export default async function StudyPlanPage({ params }: PlanPageProps) {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }
  const { planId } = await params;
  const t = await getTranslations("studyPlanner");
  const userId = session.user.id;
  const today = todayIso();

  // On-track math depends on scheduled_for/original_date already
  // reflecting today's rollover — Pass 1's page never needed this
  // (it only listed pending tasks), but getPlanStats/getPlanWeeks do.
  await rollForwardMissedTasks(userId);

  const plan = await getPlanById(userId, planId);
  if (!plan) notFound();

  const [stats, topicCoverage, weeks, pendingTasksRaw] = await Promise.all([
    getPlanStats(plan, today),
    getPlanTopicCoverage(planId),
    getPlanWeeks(userId, planId, addDays(today, -56), addDays(today, 56)),
    getTasksInRange(userId, addDays(today, -730), addDays(today, 730)),
  ]);
  const relevant = pendingTasksRaw.filter((task) => task.planId === planId && task.state === "pending").slice(0, 60);
  const tasks = await attachStartHrefs(relevant);
  const todayCount = tasks.filter((task) => task.scheduledFor === today).length;

  const percent = plan.tasksTotal === 0 ? 0 : Math.round((plan.tasksDone / plan.tasksTotal) * 100);
  const weeksLeft = plan.targetDate ? Math.max(0, Math.ceil((new Date(`${plan.targetDate}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / (7 * 86_400_000))) : null;

  const onTrackLabel =
    stats.onTrackDelta > 0
      ? t("planOnTrackAhead", { count: stats.onTrackDelta })
      : stats.onTrackDelta < 0
        ? t("planOnTrackBehind", { count: -stats.onTrackDelta })
        : t("planOnTrackExact");
  const isBehind = stats.onTrackDelta < 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <div
        className="flex flex-col gap-5 rounded-2xl border-2 p-6 sm:flex-row sm:items-center"
        style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[plan.colourKey], borderColor: QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] + "33" }}
      >
        <div
          className="flex size-28 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(${QBANK_FOLDER_COLOR_ACCENT[plan.colourKey]} ${percent}%, ${QBANK_FOLDER_COLOR_ACCENT[plan.colourKey]}33 0)` }}
        >
          <div className="flex size-[88px] flex-col items-center justify-center rounded-full" style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[plan.colourKey] }}>
            <span className="font-heading text-xl font-black text-navy">{percent}%</span>
            <span className="font-ui text-[9px] font-black tracking-[0.8px] text-secondary uppercase">{t("planComplete")}</span>
          </div>
        </div>
        <div className="flex-1">
          <h1 className="font-heading text-3xl font-black text-primary">{plan.name}</h1>
          <p className="mt-1 font-ui text-sm font-bold text-secondary">
            {plan.targetDate ? t("planCardDeadline", { date: plan.targetDate }) : t(`planKind_${plan.kind}`)}
            {weeksLeft !== null && ` · ${t("planWeeksLeft", { count: weeksLeft })}`}
            {` · ${t("planBuiltFromTopics", { count: topicCoverage.length })}`}
          </p>
          {plan.status === "active" && (
            <span
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-ui text-xs font-black ${
                isBehind ? "border-insight/40 bg-insight/10 text-insight" : "border-trust/40 bg-trust/10 text-trust"
              }`}
            >
              {isBehind ? "△" : "✓"} {onTrackLabel}
            </span>
          )}
          {plan.status === "paused" && (
            <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 font-ui text-xs font-black text-secondary">
              {t("planPausedLabel")}
            </span>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:w-[190px]">
          <Link
            href="/study-planner#today"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3.5 py-3 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Play className="size-3.5" aria-hidden="true" />
            {t("planTodaysTasks", { count: todayCount })}
          </Link>
          <AdjustPaceButton planId={plan.id} />
          <RegeneratePlanButton planId={plan.id} />
          <PlanPauseButton planId={plan.id} status={plan.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricTile value={t("planTasksDoneOfTotal", { done: plan.tasksDone, total: plan.tasksTotal })} label={t("planMetricTasksDone")} />
        <MetricTile value={t("hoursLabel", { hours: stats.hoursPerWeekAvg })} label={t("planMetricHoursAWeek")} />
        <MetricTile value={t("planMetricPaceValue", { count: stats.pacePerWeek })} label={t("planMetricCurrentPace")} />
        <MetricTile value={stats.projectedFinishIso ?? t("planMetricNoData")} label={t("planMetricProjectedFinish")} />
      </div>

      <PlanTabs
        planId={plan.id}
        studyDays={plan.studyDays}
        sessionMinutes={plan.sessionMinutes}
        maxTasksPerDay={plan.maxTasksPerDay}
        topics={topicCoverage}
        weeks={weeks}
        todayIso={today}
        tasks={tasks}
        overdueCount={stats.overdueCount}
      />
    </main>
  );
}

function MetricTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border px-3.5 py-3">
      <span className="block font-heading text-lg font-black text-navy">{value}</span>
      <span className="font-ui text-[11px] font-bold text-secondary">{label}</span>
    </div>
  );
}
