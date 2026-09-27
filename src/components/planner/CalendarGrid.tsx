"use client";

import { useTranslations } from "next-intl";
import type { StartableTask } from "@/lib/planner";
import { CalendarChip } from "./CalendarChip";
import type { useCalendarDrag } from "@/lib/useCalendarDrag";

const DAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

// Shared by the month grid (6 rows of 7) and the week grid (1 row of
// 7) — PLANNER-SPEC.md's "seven columns, tasks as chips" applies to
// both, only the cell height and the chip cap before "+n more" differ
// (week's taller cells have room for more before collapsing).
export function CalendarGrid({
  weeks,
  tasksByDate,
  todayIso,
  selectedDay,
  onSelectDay,
  onEmptyDayClick,
  maxChipsPerCell,
  minCellHeightClass,
  currentMonth,
  drag,
}: {
  weeks: string[][];
  tasksByDate: Map<string, StartableTask[]>;
  todayIso: string;
  selectedDay: string;
  onSelectDay: (date: string) => void;
  onEmptyDayClick: (date: string) => void;
  maxChipsPerCell: number;
  minCellHeightClass: string;
  currentMonth?: number;
  drag: ReturnType<typeof useCalendarDrag>;
}) {
  const t = useTranslations("studyPlanner");

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <div className="grid grid-cols-7 gap-1.5">
        {DAY_LABELS.map((d) => (
          <span key={d} className="text-center font-ui text-[10.5px] font-black tracking-[1.2px] text-secondary uppercase">
            {t(`weekDay_${d}`)}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {weeks.map((week, i) => (
          <div key={i} className="grid grid-cols-7 gap-1.5">
            {week.map((date) => {
              const dayNum = Number(date.slice(8, 10));
              const outOfMonth = currentMonth !== undefined && Number(date.slice(5, 7)) !== currentMonth;
              const isToday = date === todayIso;
              const isSelected = date === selectedDay;
              const dayTasks = tasksByDate.get(date) ?? [];
              const visible = dayTasks.slice(0, maxChipsPerCell);
              const overflow = dayTasks.length - visible.length;

              return (
                <div
                  key={date}
                  ref={drag.registerCell(date)}
                  onClick={() => (dayTasks.length === 0 ? onEmptyDayClick(date) : onSelectDay(date))}
                  className={`flex ${minCellHeightClass} cursor-pointer flex-col gap-1 rounded-xl border p-1.5 transition-colors duration-base ${
                    outOfMonth ? "bg-surface-sunken" : "bg-surface"
                  } ${isSelected ? "border-2 border-accent bg-accent-bg" : isToday ? "border-2 border-navy" : "border-border"} ${
                    drag.overDate === date ? "ring-2 ring-accent" : ""
                  }`}
                >
                  <span className={`font-ui text-[13px] font-black ${outOfMonth ? "text-border" : "text-navy"}`}>{dayNum}</span>
                  {visible.map((task) => (
                    <CalendarChip
                      key={task.id}
                      type={task.type}
                      title={task.title}
                      state={task.state}
                      overdue={task.state !== "done" && task.originalDate !== null}
                      planColourKey={task.planColourKey}
                      dragging={drag.draggedTaskId === task.id}
                      onPointerDown={
                        task.state === "pending"
                          ? (e) => {
                              e.stopPropagation();
                              drag.startDrag(task.id)(e);
                            }
                          : undefined
                      }
                    />
                  ))}
                  {overflow > 0 && <span className="font-ui text-[10px] font-bold text-secondary">{t("calendarMoreChips", { count: overflow })}</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
