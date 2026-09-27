"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createPlanAction } from "@/lib/actions/planner";
import type { PlanKind } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_ORDER, QBANK_FOLDER_COLOR_ACCENT, type QbankFolderColor } from "@/lib/qbank-folder-colors";
import { Button } from "@/components/ui/Button";

const KINDS: PlanKind[] = ["exam", "rotation", "routine", "custom"];
// 1=Mon…7=Sun, matching study_plan.study_days.
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

// A plan's own fields, same plain-form shape as NewQuestionSetDrawer —
// no generator wiring yet (Pass 2), so creating a plan here just gives
// it somewhere to hang manually-created tasks and a pace to check
// itself against once the generator exists.
export function NewPlanDrawer({ open, onClose, initialKind }: { open: boolean; onClose: () => void; initialKind?: PlanKind }) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<PlanKind>(initialKind ?? "exam");
  const [colourKey, setColourKey] = useState<QbankFolderColor>("peach");
  const [targetDate, setTargetDate] = useState("");
  const [studyDays, setStudyDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [sessionMinutes, setSessionMinutes] = useState(30);
  const [maxTasksPerDay, setMaxTasksPerDay] = useState(3);
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setKind(initialKind ?? "exam");
      setColourKey("peach");
      setTargetDate("");
      setStudyDays([1, 2, 3, 4, 5]);
      setSessionMinutes(30);
      setMaxTasksPerDay(3);
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

  function toggleDay(day: number) {
    setStudyDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }

  function handleSubmit() {
    if (!name.trim() || studyDays.length === 0) return;
    startTransition(async () => {
      const id = await createPlanAction({
        name: name.trim(),
        kind,
        colourKey,
        targetDate: targetDate || null,
        studyDays,
        sessionMinutes,
        maxTasksPerDay,
      });
      onClose();
      router.push(`/study-planner/plan/${id}`);
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={t("newPlanCta")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{t("newPlanCta")}</h2>
          <button type="button" onClick={onClose} aria-label={t("cancel")} className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planNameLabel")}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder={t("planNamePlaceholder")}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planKindLabel")}</span>
          <div className="grid grid-cols-2 gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-md border px-3 py-2 font-ui text-sm transition-colors duration-base ${
                  kind === k ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
                }`}
              >
                {t(`planKind_${k}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("colorLabel")}</span>
          <div className="flex flex-wrap gap-1.5">
            {QBANK_FOLDER_COLOR_ORDER.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={c}
                onClick={() => setColourKey(c)}
                className={`size-7 rounded-full border-2 ${colourKey === c ? "border-navy" : "border-transparent"}`}
                style={{ backgroundColor: QBANK_FOLDER_COLOR_ACCENT[c] }}
              />
            ))}
          </div>
        </div>

        {kind !== "routine" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("planTargetDateLabel")}</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
        )}

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planStudyDaysLabel")}</span>
          <div className="flex gap-1">
            {DAY_NUMBERS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={`flex-1 rounded-md border py-2 font-ui text-xs font-bold transition-colors duration-base ${
                  studyDays.includes(day) ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
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
              value={sessionMinutes}
              onChange={(e) => setSessionMinutes(Math.max(5, Number(e.target.value)))}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("planMaxTasksLabel")}</span>
            <input
              type="number"
              min={1}
              max={10}
              value={maxTasksPerDay}
              onChange={(e) => setMaxTasksPerDay(Math.max(1, Number(e.target.value)))}
              className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !name.trim() || studyDays.length === 0}>
            {isPending ? t("creating") : t("createPlan")}
          </Button>
        </div>
      </aside>
    </>
  );
}
