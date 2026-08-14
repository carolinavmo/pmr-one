"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import type { QuestionEditable, QuestionOptionInput } from "@/lib/question-bank";
import {
  createQuestionAction,
  updateQuestionAction,
  deleteQuestionAction,
  reorderQuestionsAction,
} from "@/lib/actions/question-bank";
import { useReorderDrag, dragRowClass } from "@/lib/useReorderDrag";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface OptionDraft {
  label: string;
  isCorrect: boolean;
  rationale: string;
}

function emptyOptions(): OptionDraft[] {
  return [
    { label: "", isCorrect: true, rationale: "" },
    { label: "", isCorrect: false, rationale: "" },
  ];
}

function toOptionInputs(options: OptionDraft[]): QuestionOptionInput[] {
  return options.map((o) => ({ label: o.label, isCorrect: o.isCorrect, rationale: o.rationale.trim() || null }));
}

// Editor-only authoring UI scoped to one set — add/edit/delete/reorder
// questions, each with a 2-5 option MCQ body. Plain textareas/inputs
// throughout, no rich text, same reasoning Flashcards' CardManager
// documents ("Q/A is short structured text"). Doesn't share live state
// with QuestionRunner (unlike Flashcards' CardManager+FlashcardReviewer
// pair) — a mutation here just triggers router.refresh() so the whole
// route re-fetches from the server, which is simpler than keeping two
// differently-shaped payloads (the runner's answer-leak-safe one vs.
// this component's full one) in sync by hand.
export function QuestionManager({ setId, initialQuestions }: { setId: string; initialQuestions: QuestionEditable[] }) {
  const t = useTranslations("questionBank");
  const router = useRouter();

  const questionIdsKey = initialQuestions.map((q) => q.id).join(",");
  const [prevKey, setPrevKey] = useState(questionIdsKey);
  const [questions, setQuestions] = useState(initialQuestions);
  if (questionIdsKey !== prevKey) {
    setPrevKey(questionIdsKey);
    setQuestions(initialQuestions);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const ids = questions.map((q) => q.id);
  const { draggedId, overId, registerRow, startDrag } = useReorderDrag(ids, (orderedIds) => {
    setQuestions((prev) => orderedIds.map((id) => prev.find((q) => q.id === id)!));
    reorderQuestionsAction(setId, orderedIds);
  });

  async function handleDelete(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    setDeleteTarget(null);
    await deleteQuestionAction(id);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="font-heading text-sm font-semibold text-primary">{t("manageQuestions")}</h2>

      <div className="flex flex-col divide-y divide-border">
        {questions.map((question, i) =>
          editingId === question.id ? (
            <QuestionEditorRow
              key={question.id}
              questionId={question.id}
              initial={{
                prompt: question.prompt,
                explanation: question.explanation,
                topicLabel: question.topicLabel ?? "",
                tags: question.tags.join(", "),
                options: question.options.map((o) => ({ label: o.label, isCorrect: o.isCorrect, rationale: o.rationale ?? "" })),
              }}
              onCancel={() => setEditingId(null)}
              onSaved={() => {
                setEditingId(null);
                router.refresh();
              }}
            />
          ) : (
            <div
              key={question.id}
              ref={registerRow(question.id)}
              className={`flex items-start gap-2 py-3 ${dragRowClass(question.id, draggedId, overId) ?? ""}`}
            >
              <button
                type="button"
                onPointerDown={startDrag(question.id)}
                aria-label={t("dragToReorder")}
                className="mt-1 shrink-0 cursor-grab touch-none text-secondary/60 hover:text-secondary"
              >
                <GripVertical className="size-4" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-ui text-sm text-primary">
                  {t("questionNumber", { number: i + 1 })}: {question.prompt}
                </p>
                <p className="font-ui text-xs text-secondary">{t("optionCount", { count: question.options.length })}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(question.id)}
                aria-label={t("editQuestion")}
                className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(question.id)}
                aria-label={t("deleteQuestion")}
                className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-card-red"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )
        )}
      </div>

      {adding ? (
        <QuestionEditorRow
          questionId={null}
          setId={setId}
          initial={{ prompt: "", explanation: "", topicLabel: "", tags: "", options: emptyOptions() }}
          onCancel={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("addQuestion")}
        </button>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("confirmDeleteQuestion")}
          confirmLabel={t("deleteQuestion")}
          cancelLabel={t("cancel")}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function QuestionEditorRow({
  questionId,
  setId,
  initial,
  onCancel,
  onSaved,
}: {
  questionId: string | null;
  setId?: string;
  initial: { prompt: string; explanation: string; topicLabel: string; tags: string; options: OptionDraft[] };
  onCancel: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("questionBank");
  const [prompt, setPrompt] = useState(initial.prompt);
  const [explanation, setExplanation] = useState(initial.explanation);
  const [topicLabel, setTopicLabel] = useState(initial.topicLabel);
  const [tags, setTags] = useState(initial.tags);
  const [options, setOptions] = useState<OptionDraft[]>(initial.options);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, patch: Partial<OptionDraft>) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, ...patch } : o)));
  }

  function markCorrect(index: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === index })));
  }

  function addOption() {
    if (options.length >= 5) return;
    setOptions((prev) => [...prev, { label: "", isCorrect: false, rationale: "" }]);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    if (!prompt.trim()) {
      setError(t("promptRequired"));
      return;
    }
    if (options.some((o) => !o.label.trim())) {
      setError(t("optionLabelRequired"));
      return;
    }
    const tagList = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setSaving(true);
    try {
      if (questionId) {
        await updateQuestionAction(questionId, prompt, explanation, topicLabel, tagList, toOptionInputs(options));
      } else if (setId) {
        await createQuestionAction(setId, prompt, explanation, topicLabel, tagList, toOptionInputs(options));
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 py-3">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        placeholder={t("promptPlaceholder")}
        className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
      />
      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        rows={2}
        placeholder={t("explanationPlaceholder")}
        className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input
          type="text"
          value={topicLabel}
          onChange={(e) => setTopicLabel(e.target.value)}
          placeholder={t("topicLabelPlaceholder")}
          className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
        />
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder={t("tagsPlaceholder")}
          className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-border p-2.5">
        <span className="font-ui text-xs font-medium text-secondary">{t("optionsLabel")}</span>
        {options.map((option, i) => (
          <div key={i} className="flex flex-col gap-1.5 rounded-md bg-surface p-2">
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${questionId ?? "new"}`}
                checked={option.isCorrect}
                onChange={() => markCorrect(i)}
                aria-label={t("markCorrect")}
                className="shrink-0 accent-accent"
              />
              <input
                type="text"
                value={option.label}
                onChange={(e) => updateOption(i, { label: e.target.value })}
                placeholder={t("optionLabelPlaceholder", { letter: String.fromCharCode(65 + i) })}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 font-ui text-sm text-primary outline-none focus:border-accent"
              />
              {options.length > 2 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  aria-label={t("removeOption")}
                  className="shrink-0 rounded-md p-1 text-secondary hover:bg-border/40 hover:text-card-red"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            <input
              type="text"
              value={option.rationale}
              onChange={(e) => updateOption(i, { rationale: e.target.value })}
              placeholder={t("rationalePlaceholder")}
              className="ml-6 rounded-md border border-border bg-surface-raised px-2.5 py-1.5 font-ui text-xs text-primary outline-none focus:border-accent"
            />
          </div>
        ))}
        {options.length < 5 && (
          <button
            type="button"
            onClick={addOption}
            className="flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 font-ui text-xs text-secondary hover:border-accent/40 hover:text-accent"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            {t("addOption")}
          </button>
        )}
      </div>

      {error && <p className="font-ui text-xs text-card-red">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button type="button" variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? t("saving") : t("save")}
        </Button>
      </div>
    </div>
  );
}
