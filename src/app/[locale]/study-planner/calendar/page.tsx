import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { rollForwardMissedTasks, getTasksInRange, getPlans, attachStartHrefs } from "@/lib/planner";
import { PlannerCalendar } from "@/components/planner/PlannerCalendar";
import { PlannerEmptyState } from "@/components/planner/PlannerEmptyState";

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// PLANNER-IMPLEMENTATION.md Pass 3: month/week/agenda at
// /planner/calendar, chips by plan, a day panel instead of a modal,
// drag to reschedule. The view/navigation/filter state all live
// client-side in PlannerCalendar — this page's only job is fetching a
// bounded task window once so navigating within it needs no further
// round trips. The window (-120d/+400d) comfortably covers
// PLANNER-IMPLEMENTATION.md's own demo scale (12 weeks back, 34 weeks
// forward) with room to spare; a task outside it simply won't be
// reachable by paging the calendar, which is an acceptable edge for a
// personal study planner's real-world horizon.
export default async function StudyPlannerCalendarPage() {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }
  const userId = session.user.id;
  const today = todayIso();

  await rollForwardMissedTasks(userId);

  const [tasksRaw, plans, allPlans] = await Promise.all([
    getTasksInRange(userId, addDays(today, -120), addDays(today, 400)),
    getPlans(userId, "active"),
    getPlans(userId, "all"),
  ]);
  const tasks = await attachStartHrefs(tasksRaw);

  // PLANNER-SPEC.md's empty-state rule ("hide the metrics, the week
  // strip and the calendar until something exists") names the
  // calendar explicitly, not just the Today page — an empty month
  // grid answers a question nobody asked yet (rule 3, "never show a
  // statistic at zero").
  if (tasks.length === 0 && allPlans.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
        <PlannerEmptyState />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <PlannerCalendar tasks={tasks} plans={plans} todayIso={today} />
    </main>
  );
}
