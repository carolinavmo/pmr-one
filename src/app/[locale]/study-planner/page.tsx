import { getLocale, getTranslations } from "next-intl/server";
import { Calendar } from "lucide-react";
import { redirect } from "@/i18n/navigation";
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
  if (!session) {
    // See the matching comment in account/page.tsx — the extra
    // `return` works around a TS narrowing gap with destructured
    // `never`-returning functions.
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const { month: monthParam } = await searchParams;
  const todayIso = todayIsoDate();
  const { year, month } = parseMonthParam(monthParam, todayIso);
  const { from: rangeFrom, to: rangeTo } = getVisibleRangeBounds(year, month);
  const weekBounds = getWeekBounds(todayIso);

  const t = await getTranslations("studyPlanner");
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
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Calendar className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h1 className="font-heading text-2xl font-semibold text-primary sm:text-3xl">
              {t("pageTitle")}
            </h1>
            <p className="font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
          </div>
        </div>

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
