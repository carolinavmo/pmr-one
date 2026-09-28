"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Search, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createTaskAction, updateTaskAction, searchTaskTargetsAction } from "@/lib/actions/planner";
import type { StudyPlan, TaskType, TaskTargetOption } from "@/lib/planner";
import { Button } from "@/components/ui/Button";

const TYPES: TaskType[] = ["read", "flashcards", "questions", "course", "custom"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface EditableTask {
  id: string;
  type: TaskType;
  title: string;
  estimateMinutes: number;
  scheduledFor: string;
  planId: string | null;
}

// "A task is a thing to do in the platform, not a note" (PLANNER-SPEC.md)
// — everything but 'custom' requires picking a real target, which is
// what supplies the title and a computed estimate (searchTaskTargetsAction).
// 'custom' is the one type with a plain title/estimate, and the one
// type Start never appears for.
//
// `initialDate` lets the calendar's day panel ("+ Add a task to this
// day") and clicking empty space in a day cell pre-date the drawer
// instead of always defaulting to today — the rail's own "New task"
// button omits it and gets today, same as before. `initialPlanId`
// does the same for AddTaskButton's own "+ Add task" on a plan's page
// — opened from there, of course it's for that plan, not one-off.
//
// `editTask` switches the same drawer into edit mode — same fields,
// same layout, just seeded from an existing task and submitting
// through updateTaskAction instead of createTaskAction. A separate
// "EditTaskDrawer" would have meant re-implementing the exact same
// type-tag-vs-search-vs-plain-fields branching this file already has;
// type/target stay fixed once created (re-picking a different disease
// page or deck is a new task, not an edit), so the type picker and
// target search are simply hidden and title/estimate stay read-only
// for every type but 'custom', which is exactly the distinction the
// create flow already draws.
export function NewTaskDrawer({
  open,
  onClose,
  plans,
  initialDate,
  initialPlanId,
  editTask,
}: {
  open: boolean;
  onClose: () => void;
  plans: StudyPlan[];
  initialDate?: string;
  initialPlanId?: string;
  editTask?: EditableTask;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [type, setType] = useState<TaskType>(editTask?.type ?? "custom");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaskTargetOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TaskTargetOption | null>(null);
  const [customTitle, setCustomTitle] = useState(editTask?.title ?? "");
  const [customMinutes, setCustomMinutes] = useState(editTask?.estimateMinutes ?? 15);
  const [scheduledFor, setScheduledFor] = useState(editTask?.scheduledFor ?? initialDate ?? todayIso());
  const [planId, setPlanId] = useState<string | null>(editTask?.planId ?? initialPlanId ?? null);
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      if (editTask) {
        setType(editTask.type);
        setCustomTitle(editTask.title);
        setCustomMinutes(editTask.estimateMinutes);
        setScheduledFor(editTask.scheduledFor);
        setPlanId(editTask.planId);
      } else {
        setType("custom");
        setCustomTitle("");
        setCustomMinutes(15);
        setScheduledFor(initialDate ?? todayIso());
        setPlanId(initialPlanId ?? null);
      }
    }
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Debounced search, re-run whenever the type or query changes —
  // clearing any prior selection, since a picked target from one type
  // makes no sense once the type itself changes. Never runs in edit
  // mode: type/target are both fixed once a task exists.
  useEffect(() => {
    if (!open || type === "custom" || editTask) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: clears a stale target selection when the type or search query changes underneath it, external inputs not a derivable render value.
    setSelected(null);
    setSearching(true);
    const handle = setTimeout(() => {
      searchTaskTargetsAction(type, query)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `open`/`editTask` only gate whether to run, not values the search itself depends on.
  }, [type, query]);

  const canSubmit = type === "custom" ? customTitle.trim().length > 0 : editTask ? true : selected !== null;

  function handleSubmit() {
    if (!canSubmit) return;
    startTransition(async () => {
      if (editTask) {
        await updateTaskAction(editTask.id, {
          title: type === "custom" ? customTitle.trim() : editTask.title,
          estimateMinutes: type === "custom" ? customMinutes : editTask.estimateMinutes,
          scheduledFor,
          planId,
        });
      } else {
        await createTaskAction({
          planId,
          type,
          targetRef: type === "custom" ? null : selected!.id,
          title: type === "custom" ? customTitle.trim() : selected!.title,
          estimateMinutes: type === "custom" ? customMinutes : selected!.estimateMinutes,
          scheduledFor,
        });
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={t("newTaskCta")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{editTask ? t("editTask") : t("newTaskCta")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {!editTask && (
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("taskTypeLabel")}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {TYPES.map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setType(tp)}
                  className={`rounded-md border px-2.5 py-2 font-ui text-xs font-bold transition-colors duration-base ${
                    type === tp ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
                  }`}
                >
                  {t(`type_${tp}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {editTask && type !== "custom" ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-surface-raised px-3 py-2.5">
            <span className="shrink-0 rounded-md bg-border/40 px-2 py-0.5 font-ui text-[10px] font-black tracking-[0.9px] text-secondary uppercase">
              {t(`type_${type}`)}
            </span>
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-ui text-sm font-bold text-primary">{editTask.title}</span>
              <span className="font-ui text-xs text-secondary">{t("estimateMinutes", { minutes: editTask.estimateMinutes })}</span>
            </div>
          </div>
        ) : type === "custom" ? (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs text-secondary">{t("taskTitleLabel")}</span>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                autoFocus
                className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs text-secondary">{t("taskEstimateLabel")}</span>
              <input
                type="number"
                min={1}
                value={customMinutes}
                onChange={(e) => setCustomMinutes(Math.max(1, Number(e.target.value)))}
                className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
          </>
        ) : selected ? (
          <div className="flex items-center gap-3 rounded-md border border-accent/40 bg-accent/5 px-3 py-2.5">
            <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-ui text-sm font-bold text-primary">{selected.title}</span>
              <span className="font-ui text-xs text-secondary">{selected.meta}</span>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="shrink-0 font-ui text-xs font-bold text-accent hover:text-accent-hover">
              {t("taskChangeTarget")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(`taskSearchPlaceholder_${type}`)}
                autoFocus
                className="w-full rounded-md border border-border bg-surface-raised py-2 pr-3 pl-9 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </div>
            <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
              {searching ? (
                <p className="px-1 py-2 font-ui text-xs text-secondary">{t("taskSearching")}</p>
              ) : results.length === 0 ? (
                <p className="px-1 py-2 font-ui text-xs text-secondary">{t("taskNoResults")}</p>
              ) : (
                results.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected(r)}
                    className="flex flex-col rounded-md px-3 py-2 text-left hover:bg-border/30"
                  >
                    <span className="truncate font-ui text-sm font-bold text-primary">{r.title}</span>
                    <span className="font-ui text-xs text-secondary">{r.meta}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("taskDateLabel")}</span>
          <input
            type="date"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        {plans.length > 0 && (
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("taskPlanLabel")}</span>
            <select
              value={planId ?? ""}
              onChange={(e) => setPlanId(e.target.value || null)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">{t("taskOneOff")}</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !canSubmit}>
            {editTask ? (isPending ? t("saving") : t("saveChanges")) : isPending ? t("creating") : t("createTask")}
          </Button>
        </div>
      </aside>
    </>
  );
}
