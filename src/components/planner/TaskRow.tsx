"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TaskType } from "@/lib/planner";
import { toggleTaskStateAction } from "@/lib/actions/planner";

const TYPE_TAG_CLASS: Record<TaskType, string> = {
  read: "bg-[#FFF0E4] text-[#D9762F]",
  flashcards: "bg-[#E3F6F0] text-[#2E9B80]",
  questions: "bg-[#EFEBFC] text-[#6F5FCB]",
  course: "bg-[#E7F2FB] text-[#4189C4]",
  custom: "bg-border/40 text-secondary",
};

// Shared by the Today panel, the week-strip day panel and "Coming up"
// — one task, one row: checkbox, type tag, title, estimate/when, and
// a Start link that's the whole reason this isn't a generic to-do
// (PLANNER-SPEC.md: "Every task has a Start button that opens the
// right feature with the right content loaded"). `dark` switches the
// palette for the navy Today panel; the light variant is the plain
// bordered row used everywhere else.
export function TaskRow({
  id,
  type,
  title,
  estimateLabel,
  state,
  startHref,
  overdue,
  dark,
  onToggled,
}: {
  id: string;
  type: TaskType;
  title: string;
  estimateLabel: string;
  state: "pending" | "done" | "skipped";
  startHref: string | null;
  overdue?: boolean;
  dark?: boolean;
  onToggled?: (nextDone: boolean) => void;
}) {
  const t = useTranslations("studyPlanner");
  const [isPending, startTransition] = useTransition();
  const done = state === "done";

  function handleToggle() {
    startTransition(async () => {
      const next = await toggleTaskStateAction(id);
      if (next) onToggled?.(next === "done");
    });
  }

  if (dark) {
    return (
      <div className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 ${overdue ? "bg-warning/20" : "bg-white/[0.08]"}`}>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isPending}
          aria-label={done ? t("markIncomplete") : t("markComplete")}
          aria-pressed={done}
          className={`flex size-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
            done ? "border-accent bg-accent" : "border-white/40"
          }`}
        >
          {done && <Check className="size-3.5 text-white" aria-hidden="true" strokeWidth={3} />}
        </button>
        <span
          className={`shrink-0 rounded-md px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] uppercase ${
            overdue ? "bg-white/20 text-white" : "bg-white/[0.16] text-[#C8D3E2]"
          }`}
        >
          {overdue ? t("typeOverdue") : t(`type_${type}`)}
        </span>
        <span className={`min-w-0 flex-1 truncate font-ui text-[15px] font-extrabold ${done ? "text-white/50 line-through" : "text-white"}`}>{title}</span>
        <span className="shrink-0 font-ui text-xs font-bold text-white/60">{estimateLabel}</span>
        {!done && startHref && (
          <Link href={startHref} className="shrink-0 rounded-lg bg-white/[0.18] px-3 py-1.5 font-ui text-xs font-black text-white hover:bg-white/25">
            {t("start")} ›
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 ${overdue ? "border-warning/40 bg-warning/5" : "border-border"}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={done ? t("markIncomplete") : t("markComplete")}
        aria-pressed={done}
        className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 ${done ? "border-trust bg-trust" : "border-border"}`}
      >
        {done && <Check className="size-3 text-white" aria-hidden="true" strokeWidth={3} />}
      </button>
      <span className={`shrink-0 rounded-md px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] uppercase ${overdue ? "bg-warning/15 text-warning" : TYPE_TAG_CLASS[type]}`}>
        {overdue ? t("typeOverdue") : t(`type_${type}`)}
      </span>
      <span className={`min-w-0 flex-1 truncate font-ui text-sm font-extrabold text-primary ${done ? "text-secondary line-through" : ""}`}>{title}</span>
      <span className="shrink-0 font-ui text-xs font-bold text-secondary">{estimateLabel}</span>
      {!done && startHref && (
        <Link href={startHref} className="shrink-0 rounded-lg bg-border/40 px-3 py-1.5 font-ui text-xs font-black text-primary hover:bg-border/60">
          {t("start")} ›
        </Link>
      )}
    </div>
  );
}
