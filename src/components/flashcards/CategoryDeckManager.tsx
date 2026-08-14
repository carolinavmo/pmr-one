"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { setDeckCategoryAction } from "@/lib/actions/flashcards";
import type { DeckSummary } from "@/lib/flashcards";

// Editor-only "which decks are in this folder" control. Data below it
// (the DeckCard grid) is server-rendered from the page's own props, so
// every mutation here calls router.refresh() afterward to pick up the
// server action's revalidatePath rather than tracking the deck list
// itself in local state.
export function CategoryDeckManager({
  categoryId,
  decksInFolder,
  assignableDecks,
}: {
  categoryId: string;
  decksInFolder: DeckSummary[];
  assignableDecks: DeckSummary[];
}) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const [selectedDeckId, setSelectedDeckId] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAdd() {
    if (!selectedDeckId) return;
    const deckId = selectedDeckId;
    startTransition(async () => {
      await setDeckCategoryAction(deckId, categoryId);
      setSelectedDeckId("");
      router.refresh();
    });
  }

  function handleRemove(deckId: string) {
    startTransition(async () => {
      await setDeckCategoryAction(deckId, null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-4">
      <span className="font-ui text-xs font-medium text-secondary">{t("manageFolderDecks")}</span>

      {decksInFolder.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {decksInFolder.map((deck) => (
            <span
              key={deck.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 font-ui text-xs text-primary"
            >
              {deck.name}
              <button
                type="button"
                onClick={() => handleRemove(deck.id)}
                disabled={isPending}
                aria-label={t("removeFromFolder")}
                className="text-secondary hover:text-card-red"
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {assignableDecks.length > 0 ? (
        <div className="flex items-center gap-2">
          <select
            value={selectedDeckId}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="flex-1 rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          >
            <option value="">{t("selectDeckToAdd")}</option>
            {assignableDecks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={isPending || !selectedDeckId}
            className="rounded-md bg-accent px-3 py-2 font-ui text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {t("addToFolder")}
          </button>
        </div>
      ) : (
        <p className="font-ui text-xs text-secondary">{t("noAssignableDecks")}</p>
      )}
    </div>
  );
}
