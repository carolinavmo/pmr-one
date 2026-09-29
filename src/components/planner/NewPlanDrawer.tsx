"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X, Check } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createPlanAction, updatePlanAction, listPlanTopicOptionsAction, listPlanFolderOptionsAction } from "@/lib/actions/planner";
import type { PlanKind, PlanTopicInput, PlanMode, OrderMode, PlanItemInput, FolderOption } from "@/lib/planner";
import { QBANK_FOLDER_COLOR_ORDER, QBANK_FOLDER_COLOR_ACCENT, type QbankFolderColor } from "@/lib/qbank-folder-colors";
import { Button } from "@/components/ui/Button";

const KINDS: PlanKind[] = ["exam", "rotation", "routine", "custom"];
// 1=Mon…7=Sun, matching study_plan.study_days.
const DAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];
const DEFAULT_TOPIC_WEIGHT = 5;
const MODES: PlanMode[] = ["scheduled", "flexible", "target"];
const ORDER_MODES: OrderMode[] = ["interleave", "one_topic", "as_listed"];

export interface EditablePlan {
  id: string;
  name: string;
  kind: PlanKind;
  colourKey: QbankFolderColor;
  targetDate: string | null;
  mode: PlanMode;
  orderMode: OrderMode;
  studyDays: number[];
  sessionMinutes: number;
  maxTasksPerDay: number;
  weeklyTarget: number | null;
  topics: PlanTopicInput[];
  items: PlanItemInput[];
}

// A plan's own fields, same plain-form shape as NewQuestionSetDrawer,
// plus the topic weight picker the generator reads from
// (PLANNER-IMPLEMENTATION.md Pass 2). Topics are optional — a plan
// created with none just has nowhere to hang tasks yet, same as
// before Pass 2 existed.
//
// `editPlan` switches this same drawer into "Edit plan" mode
// (PLANNER-SPEC.md rule 4, "any plan can be reshaped" — the gap Pass 4
// deliberately left open, see updatePlan's own comment for why saving
// an edit never touches the plan's existing tasks). Same fields, same
// layout — just seeded from the plan passed in and submitting through
// updatePlanAction instead of createPlanAction, same "one drawer,
// create or edit" shape NewTaskDrawer already uses.
export function NewPlanDrawer({
  open,
  onClose,
  initialKind,
  editPlan,
}: {
  open: boolean;
  onClose: () => void;
  initialKind?: PlanKind;
  editPlan?: EditablePlan;
}) {
  const t = useTranslations("studyPlanner");
  const router = useRouter();
  // A plan already carrying legacy weighted topics (and no ordered
  // items) keeps editing through the old picker below — its content
  // isn't expressible in the new model without silently reweighting
  // it, and regenerating already has its own explicit action. Every
  // other case (a brand new plan, or a plan already on the ordered
  // model) gets the new Content picker.
  const usesLegacyTopics = !!editPlan && editPlan.topics.length > 0 && editPlan.items.length === 0;

  const [name, setName] = useState(editPlan?.name ?? "");
  const [kind, setKind] = useState<PlanKind>(editPlan?.kind ?? initialKind ?? "exam");
  const [colourKey, setColourKey] = useState<QbankFolderColor>(editPlan?.colourKey ?? "peach");
  const [targetDate, setTargetDate] = useState(editPlan?.targetDate ?? "");
  const [mode, setMode] = useState<PlanMode>(editPlan?.mode ?? (initialKind === "routine" ? "target" : "scheduled"));
  const [orderMode, setOrderMode] = useState<OrderMode>(editPlan?.orderMode ?? "interleave");
  const [weeklyTarget, setWeeklyTarget] = useState(editPlan?.weeklyTarget ?? 10);
  const [studyDays, setStudyDays] = useState<number[]>(editPlan?.studyDays ?? [1, 2, 3, 4, 5]);
  const [sessionMinutes, setSessionMinutes] = useState(editPlan?.sessionMinutes ?? 30);
  const [maxTasksPerDay, setMaxTasksPerDay] = useState(editPlan?.maxTasksPerDay ?? 3);
  const [topicOptions, setTopicOptions] = useState<{ id: string; name: string }[]>([]);
  const [topicWeights, setTopicWeights] = useState<Record<string, number>>(
    editPlan ? Object.fromEntries(editPlan.topics.map((topic) => [topic.topicRef, topic.weight])) : {}
  );
  const [folderOptions, setFolderOptions] = useState<FolderOption[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set((editPlan?.items ?? []).filter((item) => item.kind === "folder").map((item) => item.refId))
  );
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      if (editPlan) {
        setName(editPlan.name);
        setKind(editPlan.kind);
        setColourKey(editPlan.colourKey);
        setTargetDate(editPlan.targetDate ?? "");
        setMode(editPlan.mode);
        setOrderMode(editPlan.orderMode);
        setWeeklyTarget(editPlan.weeklyTarget ?? 10);
        setStudyDays(editPlan.studyDays);
        setSessionMinutes(editPlan.sessionMinutes);
        setMaxTasksPerDay(editPlan.maxTasksPerDay);
        setTopicWeights(Object.fromEntries(editPlan.topics.map((topic) => [topic.topicRef, topic.weight])));
        setSelectedFolderIds(new Set(editPlan.items.filter((item) => item.kind === "folder").map((item) => item.refId)));
      } else {
        setName("");
        setKind(initialKind ?? "exam");
        setColourKey("peach");
        setTargetDate("");
        setMode(initialKind === "routine" ? "target" : "scheduled");
        setOrderMode("interleave");
        setWeeklyTarget(10);
        setStudyDays([1, 2, 3, 4, 5]);
        setSessionMinutes(30);
        setMaxTasksPerDay(3);
        setTopicWeights({});
        setSelectedFolderIds(new Set());
      }
    }
  }

  useEffect(() => {
    if (!open || !usesLegacyTopics || topicOptions.length > 0) return;
    listPlanTopicOptionsAction().then(setTopicOptions);
  }, [open, usesLegacyTopics, topicOptions.length]);

  useEffect(() => {
    if (!open || usesLegacyTopics || folderOptions.length > 0) return;
    listPlanFolderOptionsAction().then(setFolderOptions);
  }, [open, usesLegacyTopics, folderOptions.length]);

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

  function toggleFolder(id: string) {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit() {
    if (!name.trim() || studyDays.length === 0) return;
    startTransition(async () => {
      const shared = {
        name: name.trim(),
        kind,
        colourKey,
        targetDate: mode === "scheduled" ? targetDate || null : null,
        mode,
        orderMode,
        studyDays,
        sessionMinutes,
        maxTasksPerDay,
        weeklyTarget: mode === "target" ? weeklyTarget : null,
      };
      // A legacy-topics edit keeps building the old weighted shape —
      // updatePlan only takes the ordered-content path when `items`
      // is actually passed (see its own comment), so leaving it out
      // here is what keeps this plan's real content untouched.
      const payload = usesLegacyTopics
        ? {
            ...shared,
            topics: Object.entries(topicWeights).map(([topicRef, weight]) => ({
              topicRef,
              label: topicOptions.find((o) => o.id === topicRef)?.name ?? editPlan?.topics.find((t) => t.topicRef === topicRef)?.label ?? topicRef,
              weight,
            })),
          }
        : {
            ...shared,
            topics: [],
            items: [...selectedFolderIds].map((refId): PlanItemInput => ({ kind: "folder", refId })),
          };

      if (editPlan) {
        await updatePlanAction(editPlan.id, payload);
        onClose();
        router.refresh();
      } else {
        const { id } = await createPlanAction(payload);
        onClose();
        router.push(`/study-planner/plan/${id}`);
      }
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={editPlan ? t("editPlan") : t("newPlanCta")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{editPlan ? t("editPlan") : t("newPlanCta")}</h2>
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

        {!usesLegacyTopics && (
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("planModeLabel")}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`rounded-md border px-2 py-2 font-ui text-xs font-bold transition-colors duration-base ${
                    mode === m ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
                  }`}
                >
                  {t(`planMode_${m}`)}
                </button>
              ))}
            </div>
            <span className="font-ui text-[11px] text-secondary">{t(`planModeHint_${mode}`)}</span>
          </div>
        )}

        {(usesLegacyTopics ? kind !== "routine" : mode === "scheduled") && (
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

        {!usesLegacyTopics && mode === "target" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-ui text-xs text-secondary">{t("planWeeklyTargetLabel")}</span>
            <input
              type="number"
              min={1}
              value={weeklyTarget}
              onChange={(e) => setWeeklyTarget(Math.max(1, Number(e.target.value)))}
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

        {usesLegacyTopics ? (
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
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-xs text-secondary">{t("planContentLabel")}</span>
              <div className="flex flex-col gap-1 rounded-md border border-border p-2">
                {folderOptions.length === 0 ? (
                  <p className="px-1 py-1 font-ui text-xs text-secondary">{t("taskSearching")}</p>
                ) : (
                  folderOptions.map((folder) => {
                    const checked = selectedFolderIds.has(folder.id);
                    return (
                      <button
                        key={folder.id}
                        type="button"
                        onClick={() => toggleFolder(folder.id)}
                        aria-pressed={checked}
                        className="flex items-center gap-2 rounded px-1 py-1 text-left hover:bg-border/20"
                      >
                        <span
                          className={`flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2 ${checked ? "border-trust bg-trust" : "border-border"}`}
                        >
                          {checked && <Check className="size-3 text-white" aria-hidden="true" strokeWidth={3} />}
                        </span>
                        <span className="flex-1 truncate font-ui text-sm text-primary">{folder.name}</span>
                        <span className="shrink-0 font-ui text-[11px] text-secondary">
                          {t("planFolderContentCount", { diseases: folder.diseaseCount, decks: folder.deckCount })}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
              <span className="font-ui text-[11px] text-secondary">{t("planContentHint")}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-xs text-secondary">{t("planOrderLabel")}</span>
              <div className="grid grid-cols-3 gap-1.5">
                {ORDER_MODES.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrderMode(o)}
                    className={`rounded-md border px-2 py-2 font-ui text-xs font-bold transition-colors duration-base ${
                      orderMode === o ? "border-accent bg-accent/10 text-accent" : "border-border text-secondary hover:bg-border/40"
                    }`}
                  >
                    {t(`planOrder_${o}`)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

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
            {editPlan ? (isPending ? t("saving") : t("saveChanges")) : isPending ? t("creating") : t("createPlan")}
          </Button>
        </div>
      </aside>
    </>
  );
}
