"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { GripVertical, Plus, ChevronDown } from "lucide-react";
import type { AdminDeckDetail, AdminCardRow } from "@/lib/flashcards-admin";
import type { FlashcardCategory } from "@/lib/flashcards";
import {
  updateAdminDeckMetaAction,
  publishAdminDeckAction,
  unpublishAdminDeckAction,
  createAdminCardAction,
  reorderAdminCardsAction,
} from "@/lib/actions/flashcards-admin";
import { richTextToPlainText } from "@/lib/rich-text";
import { useReorderDrag, dragRowClass } from "@/lib/useReorderDrag";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { EditModeProvider, useEditMode } from "@/components/disease-page/EditMode";
import { AdminCardEditor } from "./AdminCardEditor";
import { AdminCardTools } from "./AdminCardTools";

// RichEditableText only ever renders its contentEditable/toolbar form
// when the nearest EditModeProvider's `editing` flag is true (see its
// own `!editModeOn` branch) — a gate built for disease pages' Reading/
// Editing toggle. This admin CMS has no such toggle: a card editor is
// either open or it isn't, so this just forces `editing` on for as
// long as the provider is mounted, the same way AtlasEditor.tsx's
// SyncEditingMode does for My Handbook's own always-on editing.
function AlwaysEditing() {
  const { setEditing } = useEditMode();
  useEffect(() => {
    setEditing(true);
  }, [setEditing]);
  return null;
}

export function AdminDeckEditor({
  deck,
  initialCards,
  categories,
}: {
  deck: AdminDeckDetail;
  initialCards: AdminCardRow[];
  categories: FlashcardCategory[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description);
  const [categoryId, setCategoryId] = useState(deck.categoryId ?? "");
  const [status, setStatus] = useState(deck.status);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [cards, setCards] = useState(initialCards);
  // Bulk import / AI generation don't return their new rows (just a
  // count) — they call router.refresh() and rely on this syncing the
  // freshly-fetched server data back into local state, since a plain
  // prop change doesn't reset an already-mounted useState.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: syncs post-refresh server data into local card state
    setCards(initialCards);
  }, [initialCards]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function saveMeta() {
    startTransition(() => {
      updateAdminDeckMetaAction(deck.id, { name, description, categoryId: categoryId || null });
    });
  }

  function handlePublish() {
    setPublishError(null);
    startTransition(() => {
      publishAdminDeckAction(deck.id).then((result) => {
        if (result.ok) setStatus("published");
        else setPublishError("Publish a card first — this deck has no published cards yet.");
      });
    });
  }

  async function handleAddCard() {
    const id = await createAdminCardAction(deck.id, "", "");
    if (!id) return;
    const newCard: AdminCardRow = { id, deckId: deck.id, question: "", answer: "", status: "draft", position: cards.length, contentVersion: 1, contentUpdatedAt: null };
    setCards((prev) => [...prev, newCard]);
    setExpandedId(id);
  }

  const ids = cards.map((c) => c.id);
  const { draggedId, overId, registerRow, startDrag } = useReorderDrag(ids, (orderedIds) => {
    setCards((prev) => orderedIds.map((id) => prev.find((c) => c.id === id)!));
    reorderAdminCardsAction(deck.id, orderedIds);
  });

  return (
    <EditModeProvider>
      <AlwaysEditing />
      <div className="flex flex-col gap-6">
      <button type="button" onClick={() => router.push("/admin/flashcards")} className="w-fit font-ui text-xs font-bold text-secondary hover:text-primary">
        ← All decks
      </button>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <ClinicalBadge tone={status === "draft" ? "warning" : "neutral"}>{status}</ClinicalBadge>
          {deck.reviewedAt && (
            <span className="font-ui text-xs text-secondary">
              reviewed {new Date(deck.reviewedAt).toLocaleDateString()} {deck.reviewedByName && `by ${deck.reviewedByName}`}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Deck name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveMeta}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Topic</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                startTransition(() => updateAdminDeckMetaAction(deck.id, { name, description, categoryId: e.target.value || null }));
              }}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">No topic yet</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="font-ui text-xs font-bold text-secondary">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={saveMeta}
            rows={2}
            className="rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>{publishError && <p className="font-ui text-xs font-semibold text-card-red">{publishError}</p>}</div>
          {status === "published" ? (
            <Button type="button" variant="secondary" onClick={() => startTransition(() => unpublishAdminDeckAction(deck.id).then(() => setStatus("draft")))}>
              Unpublish deck
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={handlePublish}>
              Publish deck
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-black text-navy">Cards ({cards.length})</h2>
        </div>

        <AdminCardTools deckId={deck.id} onCardsCreated={() => router.refresh()} />

        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {cards.map((card) => (
            <div key={card.id} ref={registerRow(card.id)} className={dragRowClass(card.id, draggedId, overId) ?? ""}>
              <div className="flex items-center gap-2 bg-surface p-3">
                <button
                  type="button"
                  onPointerDown={startDrag(card.id)}
                  aria-label="Drag to reorder"
                  className="shrink-0 cursor-grab touch-none text-secondary/60 hover:text-secondary"
                >
                  <GripVertical className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setExpandedId(expandedId === card.id ? null : card.id)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1 truncate font-ui text-sm text-primary">{richTextToPlainText(card.question) || "Untitled card"}</span>
                  <ClinicalBadge tone={card.status === "draft" ? "warning" : "neutral"}>{card.status}</ClinicalBadge>
                  <ChevronDown className={`size-4 shrink-0 text-secondary transition-transform ${expandedId === card.id ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
              </div>

              {expandedId === card.id && (
                <AdminCardEditor
                  card={card}
                  onChange={(updated) => setCards((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))}
                  onDeleted={() => {
                    setCards((prev) => prev.filter((c) => c.id !== card.id));
                    setExpandedId(null);
                  }}
                  onDuplicated={(newCardId) => {
                    setCards((prev) => [...prev, { ...card, id: newCardId, status: "draft", contentVersion: 1, contentUpdatedAt: null }]);
                    setExpandedId(newCardId);
                  }}
                  onClose={() => setExpandedId(null)}
                />
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAddCard}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Plus className="size-4" aria-hidden="true" />
          Add card
        </button>
      </div>
      </div>
    </EditModeProvider>
  );
}
