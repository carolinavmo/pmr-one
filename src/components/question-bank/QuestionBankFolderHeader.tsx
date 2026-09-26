"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { renameCategoryAction, deleteCategoryAction } from "@/lib/actions/question-bank";
import type { QuestionCategory } from "@/lib/question-bank";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_BORDER, QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";

// "The folder page is the folder card, enlarged — same ring colour
// logic, same three-part bar, same accuracy band" (QBANK-SPEC.md).
// Rename/delete carried over from the old CategoryHeader.tsx (folded
// in here rather than kept as a separate header, since the pastel
// panel replaces it entirely) — recolor/subject-reassignment aren't
// here; QBANK-SPEC.md's header has no chip for `color` the way the
// old plain header did (the ring already reads colourKey), and
// reassigning colourKey/subject is closer to Flashcards' own
// Settings-tab territory than anything this pass asks for.
export function QuestionBankFolderHeader({
  category,
  canManage,
  correct,
  wrong,
  notSeen,
  onStartFolder,
  onShowIncorrect,
  onShowTopics,
}: {
  category: QuestionCategory;
  canManage: boolean;
  correct: number;
  wrong: number;
  notSeen: number;
  onStartFolder: () => void;
  onShowIncorrect: () => void;
  onShowTopics: () => void;
}) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [name, setName] = useState(category.name);
  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(category.name);
  const [, startTransition] = useTransition();

  const total = correct + wrong + notSeen;
  const answered = correct + wrong;
  const accuracyPercent = answered === 0 ? null : Math.round((correct / answered) * 100);
  const accent = QBANK_FOLDER_COLOR_ACCENT[category.colourKey];

  function handleSaveName() {
    const trimmed = draft.trim() || "Untitled folder";
    setName(trimmed);
    setEditingName(false);
    startTransition(() => {
      renameCategoryAction(category.id, trimmed);
    });
  }

  function handleDelete() {
    if (!window.confirm(t("confirmDeleteFolder"))) return;
    startTransition(async () => {
      await deleteCategoryAction(category.id);
      router.push("/question-bank");
    });
  }

  return (
    <div
      className="relative flex flex-col gap-5 rounded-[20px] border-2 p-6 sm:flex-row sm:items-center"
      style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[category.colourKey], borderColor: QBANK_FOLDER_COLOR_BORDER[category.colourKey] }}
    >
      <div
        className="relative flex size-[120px] shrink-0 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${accent} ${accuracyPercent ?? 0}%, ${QBANK_FOLDER_COLOR_BORDER[category.colourKey]} 0)` }}
      >
        <div className="absolute flex size-[92px] flex-col items-center justify-center rounded-full bg-surface">
          <span className="font-heading text-[28px] font-black text-navy">{accuracyPercent === null ? "—" : `${accuracyPercent}%`}</span>
          <span className="font-ui text-[10px] font-black tracking-[1.1px] text-secondary uppercase">{t("correct")}</span>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
                className="border-b border-accent bg-transparent font-heading text-[32px] font-black text-navy outline-none"
              />
              <button type="button" onClick={handleSaveName} aria-label={t("save")} className="flex size-7 items-center justify-center rounded-full text-accent hover:bg-border/40">
                <Check className="size-4" aria-hidden="true" />
              </button>
              <button type="button" onClick={() => setEditingName(false)} aria-label={t("cancel")} className="flex size-7 items-center justify-center rounded-full text-secondary hover:bg-border/40">
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <h1 className="font-heading text-[32px] leading-tight font-black tracking-tight text-navy">{name}</h1>
              {canManage && (
                <button type="button" onClick={() => setEditingName(true)} aria-label={t("renameFolder")} className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-white/60 hover:text-navy">
                  <Pencil className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </>
          )}
        </div>
        <p className="mt-1 font-ui text-sm font-bold text-secondary">{t("folderPageSubtitle", { topics: category.setCount, questions: total, subject: category.subjectName })}</p>

        {total > 0 && (
          <>
            <div className="mt-3 flex h-2.5 max-w-[430px] overflow-hidden rounded-full">
              <div className="h-2.5" style={{ width: `${(correct / total) * 100}%`, backgroundColor: "var(--color-trust)" }} />
              <div className="h-2.5" style={{ width: `${(wrong / total) * 100}%`, backgroundColor: "var(--color-warning)" }} />
              <div className="h-2.5 flex-1 bg-[#EEF1F5]" />
            </div>
            <div className="mt-2 flex flex-wrap gap-4 font-ui text-xs font-bold text-secondary">
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-trust)" }} />
                {t("correctCount", { count: correct })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px]" style={{ backgroundColor: "var(--color-warning)" }} />
                {t("wrongCount", { count: wrong })}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-[3px] border border-border bg-[#EEF1F5]" />
                {t("notSeenCount", { count: notSeen })}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-[215px]">
        <button type="button" onClick={onStartFolder} className="rounded-xl bg-accent px-0 py-3.5 text-center font-ui text-[15px] font-black text-white hover:bg-accent-hover">
          {t("practiseThisFolder")}
        </button>
        {wrong > 0 && (
          <button
            type="button"
            onClick={onShowIncorrect}
            className="rounded-[10px] border bg-surface px-0 py-2.5 text-center font-ui text-[12.5px] font-bold text-secondary hover:bg-white"
            style={{ borderColor: QBANK_FOLDER_COLOR_BORDER[category.colourKey] }}
          >
            {t("iGotWrong", { count: wrong })}
          </button>
        )}
        {notSeen > 0 && (
          <button
            type="button"
            onClick={onShowTopics}
            className="rounded-[10px] border bg-surface px-0 py-2.5 text-center font-ui text-[12.5px] font-bold text-secondary hover:bg-white"
            style={{ borderColor: QBANK_FOLDER_COLOR_BORDER[category.colourKey] }}
          >
            {t("notSeenCount", { count: notSeen })}
          </button>
        )}
      </div>

      {canManage && (
        <button
          type="button"
          onClick={handleDelete}
          aria-label={t("deleteFolder")}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full text-secondary hover:bg-white/60 hover:text-card-red"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
