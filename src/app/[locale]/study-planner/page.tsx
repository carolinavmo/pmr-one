import { getTranslations } from "next-intl/server";
import { CalendarDays, ListTodo, Flame, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import {
  rollForwardMissedTasks,
  getPlannerRailStats,
  getPlans,
  getTasksForDate,
  getWeekSummary,
  getActiveStudyDayNumbers,
  getUpcomingTasks,
  getQueueTasks,
  getHoursThisWeek,
  getWeekProgress,
  attachStartHrefs,
} from "@/lib/planner";
import { PlannerTodayPanel } from "@/components/planner/PlannerTodayPanel";
import { WeekStrip } from "@/components/planner/WeekStrip";
import { PlanCardsGrid } from "@/components/planner/PlanCardsGrid";
import { ComingUpList } from "@/components/planner/ComingUpList";
import { UpNextList } from "@/components/planner/UpNextList";
import { PlannerEmptyState } from "@/components/planner/PlannerEmptyState";
import { StudyPlannerMockup } from "@/components/home/FeatureMockups";

const WEEK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday-start ISO week containing `iso`, matching flashcards.ts/
// question-bank.ts's own startOfIsoWeek reasoning elsewhere in this app.
function isoWeekBounds(iso: string): { from: string; to: string } {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = d.getUTCDay();
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() + ((day === 0 ? -6 : 1) - day));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

// PLANNER-SPEC.md rule 1, "Today is the page" — replaces the old
// empty month-grid landing view entirely (see git history for the
// v1 board this superseded). Study Planner stays hard-gated for a
// signed-out visitor (unlike Flashcards/Question Bank's public-browse
// idiom) — every figure here is personal with no library equivalent
// to browse.
export default async function StudyPlannerPage() {
  const session = await auth();
  const t = await getTranslations("studyPlanner");

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <CalendarDays className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <h1 className="font-heading text-3xl font-black text-primary">{t("pageTitle")}</h1>
        <p className="font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
      </div>
    </div>
  );

  if (!session) {
    const tCommon = await getTranslations("common");
    const tAuth = await getTranslations("auth");
    return (
      <main className="flex flex-1 flex-col items-center px-6 py-10">
        <div className="flex w-full max-w-6xl flex-col gap-8">
          {header}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StudyPlannerMockup dayLabels={WEEK_DAY_LABELS} taskLabel={t("aboutTaskLabel")} variant="month" />
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface-raised p-5">
                <h2 className="font-ui text-sm font-semibold text-primary">{t("aboutHeading")}</h2>
                <p className="font-ui text-sm text-secondary">{t("aboutBody")}</p>
                <ul className="flex flex-col gap-2">
                  {[t("aboutBullet1"), t("aboutBullet2"), t("aboutBullet3")].map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 font-ui text-sm text-secondary">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-insight/30 bg-insight/5 p-4">
                <div className="flex flex-col gap-2">
                  <h3 className="font-ui text-sm font-semibold text-primary">{t("membersOnlyHeading")}</h3>
                  <p className="font-ui text-sm text-secondary">{t("membersOnlyBody")}</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <Link href="/login" className="rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover">
                      {tCommon("signIn")}
                    </Link>
                    <Link href="/register" className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary hover:bg-border/20">
                      {tAuth("createAccountButton")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const userId = session.user.id;
  const today = todayIso();
  const week = isoWeekBounds(today);

  // Mutation before reads — a missed task has to have marched forward
  // to today before anything below counts it.
  await rollForwardMissedTasks(userId);

  const [railStats, activePlans, allPlans, todayTasksRaw, studyDayNumbers, upcomingTasksRaw, queueTasksRaw, hoursThisWeek, weekProgress] = await Promise.all([
    getPlannerRailStats(userId, today, week.to),
    getPlans(userId, "active"),
    getPlans(userId, "all"),
    getTasksForDate(userId, today),
    getActiveStudyDayNumbers(userId),
    getUpcomingTasks(userId, today, 7, 6),
    getQueueTasks(userId, 20),
    getHoursThisWeek(userId, week.from, week.to),
    getWeekProgress(userId, week.from, week.to),
  ]);
  const weekDays = await getWeekSummary(userId, week.from, week.to, studyDayNumbers);

  const [todayTasks, upcomingTasks, queueTasks] = await Promise.all([
    attachStartHrefs(todayTasksRaw),
    attachStartHrefs(upcomingTasksRaw),
    attachStartHrefs(queueTasksRaw),
  ]);

  const isEmpty = allPlans.length === 0 && todayTasks.length === 0 && upcomingTasks.length === 0 && queueTasks.length === 0 && railStats.doneCount === 0;

  if (isEmpty) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
        {header}
        <PlannerEmptyState />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header}
        <div className="flex flex-wrap items-center gap-5">
          <StatChip icon={ListTodo} value={railStats.todayCount} label={t("statsDueToday")} />
          <StatChip icon={CalendarDays} value={`${weekProgress.done}/${weekProgress.total}`} label={t("statsThisWeek")} />
          <StatChip icon={Flame} value={railStats.streak} label={t("statsStreak")} />
          <StatChip icon={Clock} value={t("hoursLabel", { hours: hoursThisWeek })} label={t("statsHoursStudied")} />
        </div>
      </div>

      <PlannerTodayPanel tasks={todayTasks} plans={activePlans} />

      {queueTasks.length > 0 && (
        <>
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-black text-navy">{t("upNextHeading")}</h2>
            <span className="font-ui text-xs font-bold text-secondary">{t("upNextSubtitle", { count: queueTasks.length })}</span>
          </div>
          <UpNextList tasks={queueTasks} plans={activePlans} />
        </>
      )}

      <div id="week" className="flex scroll-mt-24 items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("weekHeading")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">{t("weekSubtitle", { done: weekProgress.done, total: weekProgress.total })}</span>
        <Link href="/study-planner/calendar" className="ml-auto font-ui text-xs font-bold text-accent hover:text-accent-hover">
          {t("openCalendar")} ›
        </Link>
      </div>
      <WeekStrip days={weekDays} todayIso={today} />

      {activePlans.length > 0 && (
        <>
          <div id="plans" className="flex scroll-mt-24 items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-black text-navy">{t("plansHeading")}</h2>
            <span className="font-ui text-xs font-bold text-secondary">{t("plansSubtitle", { count: activePlans.length })}</span>
          </div>
          <PlanCardsGrid plans={activePlans} />
        </>
      )}

      {upcomingTasks.length > 0 && (
        <>
          <div className="flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-black text-navy">{t("comingUpHeading")}</h2>
            <span className="font-ui text-xs font-bold text-secondary">{t("comingUpSubtitle")}</span>
          </div>
          <ComingUpList tasks={upcomingTasks} todayIso={today} plans={activePlans} />
        </>
      )}
    </main>
  );
}

function StatChip({ icon: Icon, value, label }: { icon: typeof ListTodo; value: number | string; label: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="flex items-center gap-1.5 font-heading text-lg font-black text-navy tabular-nums">
        <Icon className="size-3.5 text-accent" aria-hidden="true" />
        {value}
      </span>
      <span className="font-ui text-[11px] text-secondary">{label}</span>
    </div>
  );
}
