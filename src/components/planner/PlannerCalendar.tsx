"use client";

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { StartableTask, StudyPlan } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { rescheduleTaskAction } from "@/lib/actions/planner";
import { useCalendarDrag } from "@/lib/useCalendarDrag";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarDayPanel } from "./CalendarDayPanel";
import { CalendarAgenda } from "./CalendarAgenda";
import { NewTaskDrawer } from "./NewTaskDrawer";

type View = "month" | "week" | "agenda";

function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function addMonths(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1)).toISOString().slice(0, 10);
}

// Monday-start, matching every other week computation in this app
// (WeekStrip, isoWeekBounds).
function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

function monthGridWeeks(cursorIso: string): string[][] {
  const start = weekStart(`${cursorIso.slice(0, 7)}-01`);
  const weeks: string[][] = [];
  let cursor = start;
  for (let w = 0; w < 6; w++) {
    const week: string[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

function weekDates(cursorIso: string): string[] {
  const start = weekStart(cursorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// Agenda has no natural "page" the way a grid does — it lists forward
// from the cursor's week for a bounded window rather than every task
// ever fetched, so a plan running a year out doesn't render hundreds
// of empty day headers.
const AGENDA_WINDOW_DAYS = 60;

// PLANNER-IMPLEMENTATION.md Pass 5: "calendar defaults to agenda" on
// mobile. Same useSyncExternalStore-over-matchMedia shape this
// codebase already uses for client-only state that would otherwise
// mismatch server/client renders (IndexSidebar.tsx's own
// prefersReducedMotion, SidebarFrame.tsx's collapsed toggle) — the
// server has no viewport to render against, so getServerSnapshot
// assumes desktop and the real value settles in on the client's first
// paint, no effect/setState round-trip needed.
function subscribeIsMobile(onChange: () => void) {
  const mql = window.matchMedia("(max-width: 639px)");
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}
function getIsMobileSnapshot(): boolean {
  return window.matchMedia("(max-width: 639px)").matches;
}
function getIsMobileServerSnapshot(): boolean {
  return false;
}

export function PlannerCalendar({ tasks, plans, todayIso }: { tasks: StartableTask[]; plans: StudyPlan[]; todayIso: string }) {
  const t = useTranslations("studyPlanner");
  const format = useFormatter();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const isMobile = useSyncExternalStore(subscribeIsMobile, getIsMobileSnapshot, getIsMobileServerSnapshot);
  // Explicit picks (clicking a tab) always win over the mobile default
  // — null just means "nothing picked yet this session".
  const [viewOverride, setViewOverride] = useState<View | null>(null);
  const view = viewOverride ?? (isMobile ? "agenda" : "month");
  const setView = setViewOverride;
  const [cursorIso, setCursorIso] = useState(todayIso);
  const [selectedDay, setSelectedDay] = useState(todayIso);
  const [hiddenPlanIds, setHiddenPlanIds] = useState<Set<string>>(new Set());
  const [hideCompleted, setHideCompleted] = useState(false);
  const [taskDrawerOpen, setTaskDrawerOpen] = useState(false);
  const [taskDrawerDate, setTaskDrawerDate] = useState(todayIso);

  const drag = useCalendarDrag((taskId, dateIso) => {
    startTransition(async () => {
      await rescheduleTaskAction(taskId, dateIso);
      router.refresh();
    });
  });

  const visibleTasks = useMemo(
    () => tasks.filter((task) => (task.planId === null || !hiddenPlanIds.has(task.planId)) && (!hideCompleted || task.state !== "done")),
    [tasks, hiddenPlanIds, hideCompleted]
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, StartableTask[]>();
    for (const task of visibleTasks) {
      const list = map.get(task.scheduledFor) ?? [];
      list.push(task);
      map.set(task.scheduledFor, list);
    }
    return map;
  }, [visibleTasks]);

  function togglePlan(id: string) {
    setHiddenPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectDay(date: string) {
    setSelectedDay(date);
  }

  function openAddTask(date: string) {
    setTaskDrawerDate(date);
    setSelectedDay(date);
    setTaskDrawerOpen(true);
  }

  function goPrev() {
    setCursorIso((iso) => (view === "month" ? addMonths(iso, -1) : addDays(iso, -7)));
  }
  function goNext() {
    setCursorIso((iso) => (view === "month" ? addMonths(iso, 1) : addDays(iso, 7)));
  }
  function goToday() {
    setCursorIso(todayIso);
    setSelectedDay(todayIso);
  }

  const cursorDate = new Date(`${cursorIso}T00:00:00Z`);
  let headerTitle: string;
  if (view === "month") {
    headerTitle = format.dateTime(cursorDate, { month: "long", year: "numeric" });
  } else {
    const dates = weekDates(cursorIso);
    const start = new Date(`${dates[0]}T00:00:00Z`);
    const end = new Date(`${dates[6]}T00:00:00Z`);
    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    // Intl.DateTimeFormat has a genuine quirk here: { day: "numeric",
    // year: "numeric" } with no month falls back to an unreadable
    // "2026 (day: 27)" rather than "27, 2026" — confirmed directly
    // against Intl, not a next-intl bug. Formatting the day alone and
    // appending the year as a plain number sidesteps it; a bare
    // numeral reads identically in every locale this app ships.
    headerTitle = sameMonth
      ? `${format.dateTime(start, { month: "short", day: "numeric" })} – ${format.dateTime(end, { day: "numeric" })}, ${end.getUTCFullYear()}`
      : `${format.dateTime(start, { month: "short", day: "numeric" })} – ${format.dateTime(end, { month: "short", day: "numeric", year: "numeric" })}`;
  }

  const agendaDates = useMemo(() => {
    const start = weekStart(cursorIso);
    return Array.from({ length: AGENDA_WINDOW_DAYS }, (_, i) => addDays(start, i));
  }, [cursorIso]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-2xl font-black text-navy">{headerTitle}</h1>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={goPrev} aria-label={t("calendarPrev")} className="flex size-8 items-center justify-center rounded-lg border border-border text-secondary hover:bg-border/30">
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={goNext} aria-label={t("calendarNext")} className="flex size-8 items-center justify-center rounded-lg border border-border text-secondary hover:bg-border/30">
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
          <button type="button" onClick={goToday} className="rounded-lg px-2.5 py-1.5 font-ui text-xs font-bold text-accent hover:bg-accent-bg">
            {t("calendarToday")}
          </button>
        </div>

        <div className="flex rounded-xl border border-border bg-surface-sunken p-1">
          {(["month", "week", "agenda"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`rounded-lg px-3.5 py-1.5 font-ui text-xs font-bold ${view === v ? "bg-surface text-navy shadow-sm" : "text-secondary"}`}
            >
              {t(`calendarView_${v}`)}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => openAddTask(selectedDay)}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-navy px-3.5 py-2 font-ui text-xs font-bold text-white hover:bg-navy/90"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("newTaskCta")}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-ui text-[11px] font-black tracking-[1px] text-secondary uppercase">{t("calendarShowLabel")}</span>
        {plans.map((plan) => {
          const hidden = hiddenPlanIds.has(plan.id);
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => togglePlan(plan.id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-xs font-bold ${
                hidden ? "border-border text-secondary/60" : "border-border text-primary"
              }`}
            >
              <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: hidden ? "var(--color-border)" : QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] }} />
              {plan.name}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setHideCompleted((v) => !v)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-ui text-xs font-bold ${
            hideCompleted ? "border-trust bg-trust/10 text-trust" : "border-border text-secondary/60"
          }`}
        >
          <span className="size-2 shrink-0 rounded-[3px]" style={{ backgroundColor: "var(--color-trust)" }} />
          {t("calendarCompletedFilter")}
        </button>
      </div>

      {view === "agenda" ? (
        <CalendarAgenda dates={agendaDates} tasksByDate={tasksByDate} plans={plans} onTaskDeleted={() => router.refresh()} />
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row">
          <CalendarGrid
            weeks={view === "month" ? monthGridWeeks(cursorIso) : [weekDates(cursorIso)]}
            tasksByDate={tasksByDate}
            todayIso={todayIso}
            selectedDay={selectedDay}
            onSelectDay={selectDay}
            onEmptyDayClick={openAddTask}
            maxChipsPerCell={view === "month" ? 3 : 6}
            minCellHeightClass={view === "month" ? "min-h-[104px]" : "min-h-[220px]"}
            currentMonth={view === "month" ? cursorDate.getUTCMonth() + 1 : undefined}
            drag={drag}
          />
          <CalendarDayPanel
            date={selectedDay}
            tasks={tasksByDate.get(selectedDay) ?? []}
            plans={plans}
            onAddTask={() => openAddTask(selectedDay)}
            onTaskDeleted={() => router.refresh()}
          />
        </div>
      )}

      {view !== "agenda" && (
        <div className="flex flex-wrap items-center gap-4 font-ui text-[11.5px] font-bold text-secondary">
          {plans.map((plan) => (
            <span key={plan.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: QBANK_FOLDER_COLOR_ACCENT[plan.colourKey] }} />
              {plan.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-warning)" }} />
            {t("typeOverdue")}
          </span>
          <span className="ml-auto">{t("calendarDragHint")}</span>
        </div>
      )}

      <NewTaskDrawer open={taskDrawerOpen} onClose={() => setTaskDrawerOpen(false)} plans={plans} initialDate={taskDrawerDate} />
    </div>
  );
}
