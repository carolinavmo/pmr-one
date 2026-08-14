"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, X } from "lucide-react";
import { renameDeckAction } from "@/lib/actions/flashcards";

// Plain click-to-edit, not RichEditableText — a deck name is short
// structured text, same reasoning NewDeckDrawer's name field already
// uses. Only rendered when the caller has already confirmed
// canManage (member on their own deck, editor/admin on a preset one).
export function EditableDeckName({ deckId, initialName }: { deckId: string; initialName: string }) {
  const t = useTranslations("flashcards");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [isPending, startTransition] = useTransition();

  function startEdit() {
    setDraft(name);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim() || "Untitled deck";
    setName(trimmed);
    setEditing(false);
    startTransition(() => {
      renameDeckAction(deckId, trimmed);
    });
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          disabled={isPending}
          className="font-reading text-2xl text-primary outline-none border-b border-accent bg-transparent"
        />
        <button
          type="button"
          onClick={handleSave}
          aria-label={t("save")}
          className="flex size-7 items-center justify-center rounded-full text-accent hover:bg-border/40"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label={t("cancel")}
          className="flex size-7 items-center justify-center rounded-full text-secondary hover:bg-border/40"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <h1 className="font-reading text-2xl text-primary">{name}</h1>
      <button
        type="button"
        onClick={startEdit}
        aria-label={t("renameDeck")}
        className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
      >
        <Pencil className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
