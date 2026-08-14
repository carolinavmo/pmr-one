"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { createCategoryAction } from "@/lib/actions/flashcards";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import type { DeckOwnerType } from "@/lib/flashcards";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { Button } from "@/components/ui/Button";

// Same drawer shape as NewDeckDrawer.tsx (name + color, plain form).
// One shared component for both entry points: FlashcardsBrowser's
// editor-only "Folders" row passes ownerType="system", its signed-in-
// member "My Folders" row passes ownerType="user" — either way the
// real gate is server-side in createCategoryAction, this prop just
// picks which kind gets created.
export function NewCategoryDrawer({
  open,
  onClose,
  ownerType,
}: {
  open: boolean;
  onClose: () => void;
  ownerType: DeckOwnerType;
}) {
  const t = useTranslations("flashcards");
  const [name, setName] = useState("");
  const [color, setColor] = useState<CardColor>("accent");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setColor("accent");
      setColorPickerOpen(false);
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

  function handleSubmit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createCategoryAction(name, color, ownerType);
      onClose();
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={t("newFolderTitle")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{t("newFolderTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("cancel")}
            className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("folderNameLabel")}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("deckColorLabel")}</span>
          <div className="relative w-fit">
            <button
              type="button"
              onClick={() => setColorPickerOpen((v) => !v)}
              className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
            >
              <span className={`size-4 rounded-full ${CARD_COLOR_SWATCH[color]}`} aria-hidden="true" />
              <span className="font-ui text-sm text-primary">{t("changeColor")}</span>
            </button>
            {colorPickerOpen && (
              <ColorSwatchPicker
                onPick={(c) => {
                  setColor(c);
                  setColorPickerOpen(false);
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-auto flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button type="button" variant="primary" onClick={handleSubmit} disabled={isPending || !name.trim()}>
            {isPending ? t("creating") : t("createFolder")}
          </Button>
        </div>
      </aside>
    </>
  );
}
