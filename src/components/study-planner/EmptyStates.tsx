"use client";

import { useTranslations } from "next-intl";
import { CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function EmptyTodayState({ onAddTask }: { onAddTask: () => void }) {
  const t = useTranslations("studyPlanner");
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-8 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-border/40 text-secondary">
        <CalendarPlus className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-ui text-sm font-medium text-primary">{t("todaysTasksEmptyHeading")}</p>
        <p className="font-ui text-sm text-secondary">{t("todaysTasksEmptyBody")}</p>
      </div>
      <Button type="button" variant="secondary" onClick={onAddTask}>
        {t("newTaskCta")}
      </Button>
    </div>
  );
}

export function EmptyPlannerState({ onAddTask }: { onAddTask: () => void }) {
  const t = useTranslations("studyPlanner");
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface-raised px-6 py-16 text-center shadow-sm">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Sparkles className="size-6" aria-hidden="true" />
      </span>
      <div className="flex max-w-md flex-col gap-1.5">
        <h2 className="font-heading text-xl font-semibold text-primary">
          {t("plannerEmptyHeading")}
        </h2>
        <p className="font-ui text-sm text-secondary">{t("plannerEmptyBody")}</p>
      </div>
      <Button type="button" variant="primary" onClick={onAddTask}>
        {t("plannerEmptyCta")}
      </Button>
    </div>
  );
}
