"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { MonthCalendar } from "./MonthCalendar";
import { TodaysTaskList } from "./TodaysTaskList";
import { TaskFormDrawer } from "./TaskFormDrawer";
import { DeleteTaskButton } from "./DeleteTaskButton";
import { OverallProgressCard } from "./OverallProgressCard";
import { WeeklyGoalCard } from "./WeeklyGoalCard";
import { UpcomingTasksCard } from "./UpcomingTasksCard";
import { StudyStreakCard } from "./StudyStreakCard";
import { EmptyPlannerState } from "./EmptyStates";
import { Button } from "@/components/ui/Button";
import type { OverallProgress, StudyTask, WeeklyProgress } from "@/lib/study-planner";

interface StudyPlannerBoardProps {
  year: number;
  month: number;
  todayIso: string;
  tasksInRange: StudyTask[];
  upcomingTasks: StudyTask[];
  streak: number;
  completedDaysThisWeek: string[];
  overallProgress: OverallProgress;
  weeklyProgress: WeeklyProgress;
  hasAnyTasks: boolean;
}

export function StudyPlannerBoard({
  year,
  month,
  todayIso,
  tasksInRange,
  upcomingTasks,
  streak,
  completedDaysThisWeek,
  overallProgress,
  weeklyProgress,
  hasAnyTasks,
}: StudyPlannerBoardProps) {
  const t = useTranslations("studyPlanner");
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [drawerTask, setDrawerTask] = useState<StudyTask | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deletingTask, setDeletingTask] = useState<StudyTask | null>(null);

  // A new visible month was navigated to — the currently selected
  // date belongs to the previous view, so fall back to today. Adjusted
  // during render (React's documented pattern for resetting state on
  // a prop change) rather than in a useEffect, which would cost an
  // extra, avoidable render pass.
  const [prevMonthKey, setPrevMonthKey] = useState(`${year}-${month}`);
  const monthKey = `${year}-${month}`;
  if (monthKey !== prevMonthKey) {
    setPrevMonthKey(monthKey);
    setSelectedDate(todayIso);
  }

  const tasksByDate = useMemo(() => {
    const map: Record<string, StudyTask[]> = {};
    for (const task of tasksInRange) {
      (map[task.scheduledDate] ??= []).push(task);
    }
    return map;
  }, [tasksInRange]);

  const selectedDateTasks = tasksByDate[selectedDate] ?? [];

  function openCreateDrawer() {
    setDrawerTask(null);
    setDrawerOpen(true);
  }

  function openEditDrawer(task: StudyTask) {
    setDrawerTask(task);
    setDrawerOpen(true);
  }

  if (!hasAnyTasks) {
    return (
      <>
        <EmptyPlannerState onAddTask={openCreateDrawer} />
        <TaskFormDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          task={drawerTask}
          defaultDate={selectedDate}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" variant="primary" onClick={openCreateDrawer}>
          <Plus className="size-4" aria-hidden="true" />
          {t("newTaskCta")}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <MonthCalendar
            year={year}
            month={month}
            todayIso={todayIso}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            tasksByDate={tasksByDate}
          />
          <TodaysTaskList
            selectedDate={selectedDate}
            todayIso={todayIso}
            tasks={selectedDateTasks}
            onEdit={openEditDrawer}
            onRequestDelete={setDeletingTask}
            onAddTask={openCreateDrawer}
          />
        </div>

        <div className="flex flex-col gap-4">
          <OverallProgressCard progress={overallProgress} />
          <WeeklyGoalCard progress={weeklyProgress} />
          <UpcomingTasksCard tasks={upcomingTasks} todayIso={todayIso} />
          <StudyStreakCard
            streak={streak}
            todayIso={todayIso}
            completedDaysThisWeek={completedDaysThisWeek}
          />
        </div>
      </div>

      <TaskFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        task={drawerTask}
        defaultDate={selectedDate}
      />
      <DeleteTaskButton task={deletingTask} onClose={() => setDeletingTask(null)} />
    </>
  );
}
