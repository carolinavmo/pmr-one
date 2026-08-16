import { getTranslations } from "next-intl/server";
import { Calendar, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import {
  getTasksInRange,
  getUpcomingTasks,
  getStreak,
  getWeeklyProgress,
  getOverallProgress,
  getCompletedDatesInRange,
} from "@/lib/study-planner";
import {
  getVisibleRangeBounds,
  getWeekBounds,
  todayIsoDate,
} from "@/components/study-planner/calendar-grid";
import { StudyPlannerBoard } from "@/components/study-planner/StudyPlannerBoard";
import { StudyPlannerMockup } from "@/components/home/FeatureMockups";

const WEEK_DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

interface StudyPlannerPageProps {
  searchParams: Promise<{ month?: string }>;
}

function parseMonthParam(month: string | undefined, todayIso: string): { year: number; month: number } {
  const fallback = {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)),
  };
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return fallback;
  const [y, m] = month.split("-").map(Number);
  if (m < 1 || m > 12) return fallback;
  return { year: y, month: m };
}

export default async function StudyPlannerPage({ searchParams }: StudyPlannerPageProps) {
  const session = await auth();
  const t = await getTranslations("studyPlanner");

  const header = (
    <div className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Calendar className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">{t("pageTitle")}</h1>
        <p className="font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
      </div>
    </div>
  );

  // Study Planner is 100% personal — there's no real task data to show
  // a signed-out visitor, so instead of the hard redirect this page
  // used to do, it now stays public-browse like Clinical Tools/
  // Flashcards/Question Bank: the left side shows the same generic
  // "shape of the UI" calendar mockup the homepage uses (no invented
  // data), and the right side explains the feature and gates the real
  // board behind sign-in.
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
                <Lock className="mt-0.5 size-5 shrink-0 text-insight" aria-hidden="true" />
                <div className="flex flex-col gap-2">
                  <h3 className="font-ui text-sm font-semibold text-primary">{t("membersOnlyHeading")}</h3>
                  <p className="font-ui text-sm text-secondary">{t("membersOnlyBody")}</p>
                  <div className="mt-1 flex flex-wrap gap-3">
                    <Link
                      href="/login"
                      className="rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
                    >
                      {tCommon("signIn")}
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-border/20"
                    >
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

  const { month: monthParam } = await searchParams;
  const todayIso = todayIsoDate();
  const { year, month } = parseMonthParam(monthParam, todayIso);
  const { from: rangeFrom, to: rangeTo } = getVisibleRangeBounds(year, month);
  const weekBounds = getWeekBounds(todayIso);

  const userId = session.user.id;

  const [
    tasksInRange,
    upcomingTasks,
    streak,
    overallProgress,
    weeklyProgress,
    completedDaysThisWeek,
  ] = await Promise.all([
    getTasksInRange(userId, rangeFrom, rangeTo),
    getUpcomingTasks(userId, todayIso, 5),
    getStreak(userId),
    getOverallProgress(userId),
    getWeeklyProgress(userId, weekBounds.from, weekBounds.to),
    getCompletedDatesInRange(userId, weekBounds.from, weekBounds.to),
  ]);

  return (
    <main className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="flex w-full max-w-6xl flex-col gap-8">
        {header}

        <StudyPlannerBoard
          year={year}
          month={month}
          todayIso={todayIso}
          tasksInRange={tasksInRange}
          upcomingTasks={upcomingTasks}
          streak={streak}
          completedDaysThisWeek={completedDaysThisWeek}
          overallProgress={overallProgress}
          weeklyProgress={weeklyProgress}
          hasAnyTasks={overallProgress.total > 0}
        />
      </div>
    </main>
  );
}
