"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { updatePlanScheduleAction } from "@/lib/actions/planner";
import { Button } from "@/components/ui/Button";

// 1=Mon…7=Sun, matching study_plan.study_days.
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

function sameDays(a: number[], b: number[]): boolean {
  return a.length === b.length && [...a].sort().every((d, i) => d === [...b].sort()[i]);
}

// The Schedule tab's own inline "edit study days / session length"
// (direct feedback — this used to only be reachable through the full
// Edit plan drawer). Deliberately narrow: just the three fields that
// govern how tasks get laid out day to day, saved through
// updatePlanScheduleAction rather than the full plan-editing payload,
// and it never touches study_plan_task itself (see that action's own
// comment) — the schedule changes for whatever gets generated next,
// not what's already placed.
export function PlanScheduleSettings({
  planId,
  studyDays,
  sessionMinutes,
  maxTasksPerDay,
}: {
  planId: string;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [days, setDays] = useState(studyDays);
  const [minutes, setMinutes] = useState(sessionMinutes);
  const [maxTasks, setMaxTasks] = useState(maxTasksPerDay);
  const [isPending, startTransition] = useTransition();

  const dirty = !sameDays(days, studyDays) || minutes !== sessionMinutes || maxTasks !== maxTasksPerDay;

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleSave() {
    if (days.length === 0) return;
    startTransition(async () => {
      await updatePlanScheduleAction(planId, { studyDays: days, sessionMinutes: minutes, maxTasksPerDay: maxTasks });
      router.refresh();
    });
  }

  function handleReset() {
    setDays(studyDays);
    setMinutes(sessionMinutes);
    setMaxTasks(maxTasksPerDay);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-3.5">
      <div className="flex flex-col gap-1.5">
        <span className="font-ui text-xs text-secondary">{t("planStudyDaysLabel")}</span>
        <div className="flex gap-1">
          {DAY_NUMBERS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`flex-1 rounded-md border py-2 font-ui text-xs font-bold transition-colors duration-base ${
                days.includes(day) ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
              }`}
            >
              {t(`dayInitial_${day}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planSessionMinutesLabel")}</span>
          <input
            type="number"
            min={5}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(5, Number(e.target.value)))}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planMaxTasksLabel")}</span>
          <input
            type="number"
            min={1}
            max={10}
            value={maxTasks}
            onChange={(e) => setMaxTasks(Math.max(1, Number(e.target.value)))}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>
      </div>

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={handleReset} disabled={isPending}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} disabled={isPending || days.length === 0}>
            {isPending ? t("saving") : t("saveChanges")}
          </Button>
        </div>
      )}
    </div>
  );
}
