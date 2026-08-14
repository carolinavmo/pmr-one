"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Layers, Palette, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { renameCategoryAction, updateCategoryColorAction, deleteCategoryAction } from "@/lib/actions/flashcards";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import type { FlashcardCategory } from "@/lib/flashcards";

// Folder-page equivalent of EditableDeckName + DeckIconEditor bundled
// into one header — a folder has no owner to check (unlike a deck),
// so `canManage` is just the caller's isEditor, no ownership branch.
export function CategoryHeader({ category, canManage }: { category: FlashcardCategory; canManage: boolean }) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [color, setColor] = useState<CardColor>(category.color);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [, startTransition] = useTransition();
  const Icon = category.icon ? cardIcons[category.icon as CardIconName] : Layers;

  function startEdit() {
    setDraft(name);
    setEditingName(true);
  }

  function handleSaveName() {
    const trimmed = draft.trim() || "Untitled folder";
    setName(trimmed);
    setEditingName(false);
    startTransition(() => {
      renameCategoryAction(category.id, trimmed);
    });
  }

  function handlePickColor(c: CardColor) {
    setColor(c);
    setColorPickerOpen(false);
    startTransition(() => {
      updateCategoryColorAction(category.id, c);
    });
  }

  function handleDelete() {
    if (!window.confirm(t("confirmDeleteFolder"))) return;
    startTransition(async () => {
      await deleteCategoryAction(category.id);
      router.push("/flashcards");
    });
  }

  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full text-white ${CARD_COLOR_SWATCH[color]}`}>
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              autoFocus
              className="border-b border-accent bg-transparent font-reading text-2xl text-primary outline-none"
            />
            <button
              type="button"
              onClick={handleSaveName}
              aria-label={t("save")}
              className="flex size-7 items-center justify-center rounded-full text-accent hover:bg-border/40"
            >
              <Check className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setEditingName(false)}
              aria-label={t("cancel")}
              className="flex size-7 items-center justify-center rounded-full text-secondary hover:bg-border/40"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-reading text-2xl text-primary">{name}</h1>
            {canManage && (
              <button
                type="button"
                onClick={startEdit}
                aria-label={t("renameFolder")}
                className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
              >
                <Pencil className="size-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
        <span className="font-ui text-xs text-secondary">{t("deckCount", { count: category.deckCount })}</span>
      </div>

      {canManage && (
        <div className="flex shrink-0 items-center gap-1">
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorPickerOpen((v) => !v)}
              aria-label={t("changeColor")}
              className="flex size-9 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary"
            >
              <Palette className="size-4" aria-hidden="true" />
            </button>
            {colorPickerOpen && <ColorSwatchPicker onPick={handlePickColor} />}
          </div>
          <button
            type="button"
            onClick={handleDelete}
            aria-label={t("deleteFolder")}
            className="flex size-9 items-center justify-center rounded-full text-secondary hover:bg-card-red/10 hover:text-card-red"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
