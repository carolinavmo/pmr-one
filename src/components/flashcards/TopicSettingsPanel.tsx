"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Palette, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  renameCategoryAction,
  updateCategoryColorAction,
  updateCategoryTopicColorAction,
  updateCategorySubjectAction,
  deleteCategoryAction,
} from "@/lib/actions/flashcards";
import type { CardColor } from "@/lib/editorial-blocks";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { TopicColorPicker } from "./TopicColorPicker";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import type { FlashcardCategory, FlashcardSubjectRow } from "@/lib/flashcards";

// The "Settings" tab (FLASHCARDS-IMPLEMENTATION.md Pass 3) — rename,
// recolour (both the decorative `color` still used for the folder's
// icon chip elsewhere, and the Candy `topicColor` this page's own
// ring/bar/swatches read) and delete, relocated out of the
// always-visible header (TopicPageHeader.tsx) that used to carry them
// directly (CategoryHeader.tsx, now folded into this panel).
export function TopicSettingsPanel({
  category,
  subjects,
  onRenamed,
  onTopicColorChanged,
}: {
  category: FlashcardCategory;
  // Only passed for a system topic — a user folder's Settings tab has
  // no subject picker at all (see the `category.ownerType === "system"`
  // guard below), so there's nothing for an empty array to render.
  subjects: FlashcardSubjectRow[];
  onRenamed: (name: string) => void;
  onTopicColorChanged: (color: TopicColor) => void;
}) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const [draft, setDraft] = useState(category.name);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [topicColorPickerOpen, setTopicColorPickerOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(category.subjectId);
  const [, startTransition] = useTransition();

  function handleSaveName() {
    const trimmed = draft.trim() || "Untitled folder";
    onRenamed(trimmed);
    startTransition(() => {
      renameCategoryAction(category.id, trimmed);
    });
  }

  function handlePickColor(c: CardColor) {
    setColorPickerOpen(false);
    startTransition(() => {
      updateCategoryColorAction(category.id, c);
    });
  }

  function handlePickTopicColor(c: TopicColor) {
    onTopicColorChanged(c);
    setTopicColorPickerOpen(false);
    startTransition(() => {
      updateCategoryTopicColorAction(category.id, c);
    });
  }

  function handleSubjectChange(next: string) {
    setSubjectId(next);
    startTransition(() => {
      updateCategorySubjectAction(category.id, next);
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
    <div className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-col gap-1.5">
        <label className="font-ui text-xs font-bold text-secondary">{t("folderNameLabel")}</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={handleSaveName}
            className="w-full max-w-xs rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs font-bold text-secondary">{t("deckColorLabel")}</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setColorPickerOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-ui text-xs font-bold text-secondary hover:bg-border/30 hover:text-primary"
            >
              <Palette className="size-4" aria-hidden="true" />
              {t("changeColor")}
            </button>
            {colorPickerOpen && <ColorSwatchPicker onPick={handlePickColor} className="absolute top-full left-0 z-10 mt-1 w-48" />}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs font-bold text-secondary">{t("topicColor")}</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setTopicColorPickerOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 font-ui text-xs font-bold text-secondary hover:bg-border/30 hover:text-primary"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {t("topicColor")}
            </button>
            {topicColorPickerOpen && <TopicColorPicker onPick={handlePickTopicColor} className="absolute top-full left-0 z-10 mt-1 w-40" />}
          </div>
        </div>

        {category.ownerType === "system" && (
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-xs font-bold text-secondary">{t("subjectLabel")}</span>
            <select
              value={subjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-xs font-bold text-secondary outline-none focus:border-accent"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={handleDelete}
          className="flex items-center gap-2 rounded-lg border border-card-red/30 px-3 py-2 font-ui text-xs font-bold text-card-red hover:bg-card-red/10"
        >
          <Trash2 className="size-4" aria-hidden="true" />
          {t("deleteFolder")}
        </button>
      </div>
    </div>
  );
}
