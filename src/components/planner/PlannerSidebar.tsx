"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Play, Search, ListTodo, AlertCircle, CheckCircle2, Calendar, Plus } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import type { StudyPlan } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { NewTaskDrawer } from "./NewTaskDrawer";
import { NewPlanDrawer } from "./NewPlanDrawer";

// PLANNER-SPEC.md rule 6, "the rail is the planner" — the same fix
// already applied to Clinical Tools/Flashcards/Question Bank: swapped
// in by SidebarFrame.tsx for the whole /study-planner subtree instead
// of the generic library tree. Pass 1 doesn't build separate filtered
// list pages for This week/Overdue/Done yet (that's real scope, not a
// shortcut worth faking) — those three rows link to the Today page's
// own anchors instead of a 404, same "every link does something real"
// discipline as everywhere else in this app.
interface PlannerSidebarProps {
  isSignedIn: boolean;
  railStats: { todayCount: number; thisWeekCount: number; overdueCount: number; doneCount: number; streak: number } | null;
  plans: StudyPlan[];
  headerAction?: ReactNode;
}

export function PlannerSidebar({ isSignedIn, railStats, plans, headerAction }: PlannerSidebarProps) {
  const t = useTranslations("studyPlanner");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [planDrawerOpen, setPlanDrawerOpen] = useState(false);

  const q = query.trim().toLowerCase();
  const matchingPlans = useMemo(() => plans.filter((p) => !q || p.name.toLowerCase().includes(q)), [plans, q]);

  const isToday = pathname === "/study-planner";

  return (
    <nav aria-label={t("pageTitle")} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto">
      <div className="flex items-center gap-1.5">
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => setTaskDrawerOpen(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("newTaskCta")}
          </button>
        ) : (
          <Link
            href="/login"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("newTaskCta")}
          </Link>
        )}
        {headerAction}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="px-2.5 font-ui text-xs font-medium text-secondary">{t("railHeading")}</span>
        <div className="flex flex-col gap-0.5">
          <RailRow icon={Play} iconClassName="text-accent" label={t("railToday")} count={railStats?.todayCount ?? 0} active={isToday} href="/study-planner" />
          <RailRow icon={ListTodo} iconClassName="text-secondary" label={t("railThisWeek")} count={railStats?.thisWeekCount ?? 0} href="/study-planner#week" />
          <RailRow
            icon={AlertCircle}
            iconClassName="text-warning"
            label={t("railOverdue")}
            count={railStats?.overdueCount ?? 0}
            emphasizeCount={(railStats?.overdueCount ?? 0) > 0}
            href="/study-planner#today"
          />
          <RailRow icon={CheckCircle2} iconClassName="text-trust" label={t("railDone")} count={railStats?.doneCount ?? 0} href="/study-planner#plans" />
          <RailRow icon={Calendar} iconClassName="text-secondary" label={t("railCalendar")} href="/study-planner/calendar" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2.5">
          <span className="font-ui text-xs font-medium text-secondary">{t("railMyPlans")}</span>
          {isSignedIn && (
            <button type="button" onClick={() => setPlanDrawerOpen(true)} aria-label={t("newPlanCta")} className="text-secondary hover:text-accent">
              <Plus className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {matchingPlans.length === 0 ? (
            <p className="px-2.5 font-ui text-xs text-secondary">{t("railNoPlansYet")}</p>
          ) : (
            matchingPlans.map((plan) => <PlanRow key={plan.id} plan={plan} />)
          )}
        </div>
      </div>

      {isSignedIn && <NewTaskDrawer open={taskDrawerOpen} onClose={() => setTaskDrawerOpen(false)} plans={plans} />}
      {isSignedIn && <NewPlanDrawer open={planDrawerOpen} onClose={() => setPlanDrawerOpen(false)} />}

      {railStats && (
        <p className="mt-auto border-t border-border px-2.5 pt-3 font-ui text-xs text-secondary">
          {t("railFooter", { count: railStats.thisWeekCount, streak: railStats.streak })}
        </p>
      )}
    </nav>
  );
}

function RailRow({
  icon: Icon,
  iconClassName,
  label,
  count,
  active,
  emphasizeCount,
  href,
}: {
  icon: typeof Play;
  iconClassName: string;
  label: string;
  count?: number;
  active?: boolean;
  emphasizeCount?: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${active ? "bg-border/30" : "hover:bg-border/30"}`}
    >
      <Icon className={`size-4 shrink-0 ${iconClassName}`} aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className={`font-ui text-xs ${emphasizeCount ? "font-black text-warning" : "font-normal text-secondary"}`}>{count}</span>
      )}
    </Link>
  );
}

function PlanRow({ plan }: { plan: StudyPlan }) {
  const pathname = usePathname();
  const isActive = pathname === `/study-planner/plan/${plan.id}`;
  const percent = plan.tasksTotal === 0 ? 0 : Math.round((plan.tasksDone / plan.tasksTotal) * 100);
  return (
    <Link
      href={`/study-planner/plan/${plan.id}`}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary ${isActive ? "bg-border/30" : "hover:bg-border/30"}`}
    >
      <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] }} />
      <span className="min-w-0 flex-1 truncate">{plan.name}</span>
      <span className="font-ui text-xs font-normal text-secondary">{percent}%</span>
    </Link>
  );
}
