"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createQuestionSetAction } from "@/lib/actions/question-bank";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import type { Difficulty, QuestionCategory } from "@/lib/question-bank";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { Button } from "@/components/ui/Button";

const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
const DIFFICULTY_LABEL_KEY = {
  easy: "difficultyEasy",
  medium: "difficultyMedium",
  hard: "difficultyHard",
} as const;

// Same plain-form shape as Flashcards' NewDeckDrawer, widened with a
// difficulty picker and an optional folder picker (a set can be
// created unfiled, same as an unfiled deck) — categoryId defaults to
// whichever folder this drawer was opened from, if any.
export function NewQuestionSetDrawer({
  open,
  onClose,
  categories,
  defaultCategoryId,
}: {
  open: boolean;
  onClose: () => void;
  categories: QuestionCategory[];
  defaultCategoryId: string | null;
}) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [name, setName] = useState("");
  const [color, setColor] = useState<CardColor>("accent");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [categoryId, setCategoryId] = useState<string | null>(defaultCategoryId);
  const [isPending, startTransition] = useTransition();

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setColor("accent");
      setColorPickerOpen(false);
      setDifficulty("medium");
      setCategoryId(defaultCategoryId);
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
      const set = await createQuestionSetAction(name, color, difficulty, categoryId);
      onClose();
      router.push(`/question-bank/set/${set.id}`);
    });
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} aria-hidden="true" />}

      <aside
        aria-label={t("newSetTitle")}
        className={`fixed top-0 right-0 z-50 flex h-full w-96 max-w-[90vw] flex-col gap-4 overflow-y-auto border-l border-border bg-surface p-5 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{t("newSetTitle")}</h2>
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
          <span className="font-ui text-xs text-secondary">{t("setNameLabel")}</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("folderLabel")}</span>
          <select
            value={categoryId ?? ""}
            onChange={(e) => setCategoryId(e.target.value || null)}
            className="rounded-md border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          >
            <option value="">{t("noFolder")}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("difficultyLabel")}</span>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`flex-1 rounded-md border px-3 py-2 font-ui text-sm capitalize transition-colors duration-base ${
                  difficulty === d
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-secondary hover:bg-border/40"
                }`}
              >
                {t(DIFFICULTY_LABEL_KEY[d])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="font-ui text-xs text-secondary">{t("colorLabel")}</span>
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
            {isPending ? t("creating") : t("createSet")}
          </Button>
        </div>
      </aside>
    </>
  );
}
