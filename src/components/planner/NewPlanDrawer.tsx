"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createPlanAction, listPlanTopicOptionsAction } from "@/lib/actions/planner";
import type { PlanKind } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_ORDER, QBANK_FOLDER_COLOR_ACCENT, type QbankFolderColor } from "@/lib/qbank-folder-colors";
import { Button } from "@/components/ui/Button";

const KINDS: PlanKind[] = ["exam", "rotation", "routine", "custom"];
// 1=Mon…7=Sun, matching study_plan.study_days.
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_TOPIC_WEIGHT = 5;

// A plan's own fields, same plain-form shape as NewQuestionSetDrawer,
// plus the topic weight picker the generator reads from
// (PLANNER-IMPLEMENTATION.md Pass 2). Topics are optional — a plan
// created with none just has nowhere to hang tasks yet, same as
// before Pass 2 existed.
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
  const [topicOptions, setTopicOptions] = useState<{ id: string; name: string }[]>([]);
  const [topicWeights, setTopicWeights] = useState<Record<string, number>>({});
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
      setTopicWeights({});
    }
  }

  useEffect(() => {
    if (!open || topicOptions.length > 0) return;
    listPlanTopicOptionsAction().then(setTopicOptions);
  }, [open, topicOptions.length]);

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

  function toggleTopic(id: string) {
    setTopicWeights((prev) => {
      const next = { ...prev };
      if (id in next) delete next[id];
      else next[id] = DEFAULT_TOPIC_WEIGHT;
      return next;
    });
  }

  function handleSubmit() {
    if (!name.trim() || studyDays.length === 0) return;
    startTransition(async () => {
      const topics = Object.entries(topicWeights).map(([topicRef, weight]) => ({
        topicRef,
        label: topicOptions.find((o) => o.id === topicRef)?.name ?? topicRef,
        weight,
      }));
      const { id } = await createPlanAction({
        name: name.trim(),
        kind,
        colourKey,
        targetDate: targetDate || null,
        studyDays,
        sessionMinutes,
        maxTasksPerDay,
        topics,
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

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("planTopicsLabel")}</span>
          <div className="flex flex-col gap-1 rounded-md border border-border p-2">
            {topicOptions.length === 0 ? (
              <p className="px-1 py-1 font-ui text-xs text-secondary">{t("taskSearching")}</p>
            ) : (
              topicOptions.map((topic) => {
                const checked = topic.id in topicWeights;
                return (
                  <div key={topic.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-border/20">
                    <button
                      type="button"
                      onClick={() => toggleTopic(topic.id)}
                      aria-pressed={checked}
                      className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 ${checked ? "border-trust bg-trust" : "border-border"}`}
                    >
                      {checked && <Check className="size-3 text-white" aria-hidden="true" strokeWidth={3} />}
                    </button>
                    <span className="flex-1 truncate font-ui text-sm text-primary">{topic.name}</span>
                    {checked && (
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={topicWeights[topic.id]}
                        onChange={(e) => setTopicWeights((prev) => ({ ...prev, [topic.id]: Math.max(1, Number(e.target.value)) }))}
                        className="w-14 shrink-0 rounded border border-border bg-surface-raised px-1.5 py-1 text-center font-ui text-xs text-primary outline-none focus:border-accent"
                      />
                    )}
                  </div>
                );
              })
            )}
          </div>
          <span className="font-ui text-[11px] text-secondary">{t("planTopicsHint")}</span>
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
