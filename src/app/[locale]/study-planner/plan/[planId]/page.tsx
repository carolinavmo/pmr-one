import { getTranslations } from "next-intl/server";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getPlanById, getTasksInRange, attachStartHrefs } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { TaskRow } from "@/components/planner/TaskRow";

interface PlanPageProps {
  params: Promise<{ planId: string }>;
}

// A real (not fake) plan page — ring, name, progress and its own
// pending tasks. PLANNER-IMPLEMENTATION.md Pass 4 adds the on-track
// pill, coverage-by-topic, the week squares and pace re-spreading;
// none of that needs pretending to exist here in the meantime.
export default async function StudyPlanPage({ params }: PlanPageProps) {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }
  const { planId } = await params;
  const t = await getTranslations("studyPlanner");

  const plan = await getPlanById(session.user.id, planId);
  if (!plan) notFound();

  const farFuture = new Date();
  farFuture.setUTCFullYear(farFuture.getUTCFullYear() + 2);
  const pendingTasks = await getTasksInRange(session.user.id, new Date(0).toISOString().slice(0, 10), farFuture.toISOString().slice(0, 10));
  const relevant = pendingTasks.filter((task) => task.planId === planId && task.state === "pending").slice(0, 30);
  const tasks = await attachStartHrefs(relevant);

  const percent = plan.tasksTotal === 0 ? 0 : Math.round((plan.tasksDone / plan.tasksTotal) * 100);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <div
        className="flex flex-col gap-5 rounded-2xl p-6 sm:flex-row sm:items-center"
        style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[plan.colourKey] }}
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
            {plan.targetDate ? t("planCardDeadline", { date: plan.targetDate }) : t(`planKind_${plan.kind}`)} · {t("planTasksDoneOfTotal", { done: plan.tasksDone, total: plan.tasksTotal })}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-black text-navy">{t("planUpcomingTasks")}</h2>
        {tasks.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("planNoTasksYet")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                id={task.id}
                type={task.type}
                title={task.title}
                estimateLabel={t("estimateMinutes", { minutes: task.estimateMinutes })}
                state={task.state}
                startHref={task.startHref}
                overdue={task.originalDate !== null}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
