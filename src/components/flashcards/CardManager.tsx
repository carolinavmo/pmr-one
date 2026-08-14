"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";
import type { FlashcardCard } from "@/lib/flashcards";
import { createCardAction, updateCardAction, deleteCardAction, reorderCardsAction } from "@/lib/actions/flashcards";
import { useReorderDrag, dragRowClass } from "@/lib/useReorderDrag";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Owner-only card CRUD for a user-created deck. Plain question/answer
// textareas, not RichEditableText — flashcard content is short
// structured Q&A text, not long-form notes, same reasoning
// NewDeckDrawer uses for its plain name field. Cards live in the
// parent DeckWorkspace (not local state here) so an add/edit/delete/
// reorder is immediately visible in the sibling FlashcardReviewer too.
export function CardManager({
  deckId,
  cards,
  onCardsChange: setCards,
}: {
  deckId: string;
  cards: FlashcardCard[];
  onCardsChange: (update: FlashcardCard[] | ((prev: FlashcardCard[]) => FlashcardCard[])) => void;
}) {
  const t = useTranslations("flashcards");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");
  const [adding, setAdding] = useState(false);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const ids = cards.map((c) => c.id);
  const { draggedId, overId, registerRow, startDrag } = useReorderDrag(ids, (orderedIds) => {
    setCards((prev) => orderedIds.map((id) => prev.find((c) => c.id === id)!));
    reorderCardsAction(deckId, orderedIds);
  });

  function startEdit(card: FlashcardCard) {
    setEditingId(card.id);
    setEditQuestion(card.question);
    setEditAnswer(card.answer);
  }

  function saveEdit() {
    if (!editingId) return;
    const id = editingId;
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, question: editQuestion, answer: editAnswer } : c)));
    setEditingId(null);
    updateCardAction(id, editQuestion, editAnswer);
  }

  async function handleAdd() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    const card = await createCardAction(deckId, newQuestion, newAnswer);
    if (card) setCards((prev) => [...prev, card]);
    setNewQuestion("");
    setNewAnswer("");
    setAdding(false);
  }

  function handleDelete(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    deleteCardAction(id);
    setDeleteTarget(null);
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <h2 className="font-heading text-sm font-semibold text-primary">{t("manageCards")}</h2>

      <div className="flex flex-col divide-y divide-border">
        {cards.map((card) => (
          <div
            key={card.id}
            ref={registerRow(card.id)}
            className={`flex flex-col gap-2 py-3 ${dragRowClass(card.id, draggedId, overId) ?? ""}`}
          >
            {editingId === card.id ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={editQuestion}
                  onChange={(e) => setEditQuestion(e.target.value)}
                  rows={2}
                  placeholder={t("questionPlaceholder")}
                  className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
                />
                <textarea
                  value={editAnswer}
                  onChange={(e) => setEditAnswer(e.target.value)}
                  rows={2}
                  placeholder={t("answerPlaceholder")}
                  className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={() => setEditingId(null)}>
                    {t("cancel")}
                  </Button>
                  <Button type="button" variant="primary" onClick={saveEdit}>
                    {t("save")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onPointerDown={startDrag(card.id)}
                  aria-label={t("dragToReorder")}
                  className="mt-1 shrink-0 cursor-grab touch-none text-secondary/60 hover:text-secondary"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
                <span className="min-w-0 flex-1 truncate font-ui text-sm text-primary">{card.question}</span>
                <button
                  type="button"
                  onClick={() => startEdit(card)}
                  aria-label={t("editCard")}
                  className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
                >
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(card.id)}
                  aria-label={t("deleteCard")}
                  className="shrink-0 rounded-md p-1.5 text-secondary hover:bg-border/40 hover:text-card-red"
                >
                  <Trash2 className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {adding ? (
        <div className="flex flex-col gap-2 border-t border-border pt-3">
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            rows={2}
            autoFocus
            placeholder={t("questionPlaceholder")}
            className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <textarea
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            rows={2}
            placeholder={t("answerPlaceholder")}
            className="rounded-md border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setAdding(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="primary" onClick={handleAdd}>
              {t("addCard")}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("addCard")}
        </button>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={t("confirmDeleteCard")}
          confirmLabel={t("deleteCard")}
          cancelLabel={t("cancel")}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
