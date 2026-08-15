"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Difficulty, QuestionSetSummary } from "@/lib/question-bank";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { StartSetButton } from "./StartSetButton";

const DIFFICULTY_LEVEL: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
const DIFFICULTY_LABEL_KEY: Record<Difficulty, "difficultyEasy" | "difficultyMedium" | "difficultyHard"> = {
  easy: "difficultyEasy",
  medium: "difficultyMedium",
  hard: "difficultyHard",
};

// Three small dots, filled left-to-right up to this set's difficulty
// level — mirrors the reference screenshot's difficulty indicator
// without needing a separate icon per level.
export function DifficultyDots({ difficulty }: { difficulty: Difficulty }) {
  const t = useTranslations("questionBank");
  const level = DIFFICULTY_LEVEL[difficulty];
  return (
    <span className="flex items-center gap-2">
      <span className="flex items-center gap-0.5">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={`size-1.5 rounded-full ${i <= level ? "bg-insight" : "bg-border"}`}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="font-ui text-xs text-secondary">{t(DIFFICULTY_LABEL_KEY[difficulty])}</span>
    </span>
  );
}

// Grid tile — mirrors Flashcards' DeckCard.tsx shape (color chip tag,
// name, a progress bar when signed in, a bottom CTA), swapping the
// favorite star for a difficulty indicator since sets aren't
// favoritable in this pass.
export function QuestionSetCard({ set }: { set: QuestionSetSummary }) {
  const t = useTranslations("questionBank");

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-start justify-between gap-2">
        <span className={`w-fit rounded-full px-2.5 py-1 font-ui text-xs font-medium ${CARD_COLOR_CHIP[set.color]}`}>
          {set.categoryName ?? t("unfiled")}
        </span>
        <DifficultyDots difficulty={set.difficulty} />
      </div>

      <Link href={`/question-bank/set/${set.id}`} className="flex flex-col gap-0.5">
        <span className="line-clamp-2 font-ui text-sm font-semibold text-primary">{set.name}</span>
        <span className="font-ui text-xs text-secondary">{t("questionCount", { count: set.questionCount })}</span>
      </Link>

      {set.yourScore !== null && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
            <div className="h-full rounded-full bg-accent" style={{ width: `${set.yourScore}%` }} />
          </div>
          <span className="font-ui text-xs text-secondary tabular-nums">{set.yourScore}%</span>
        </div>
      )}

      <StartSetButton set={set} variant="card" />
    </div>
  );
}

// List row — mirrors Flashcards' DeckListRow.tsx.
export function QuestionSetListRow({ set }: { set: QuestionSetSummary }) {
  const t = useTranslations("questionBank");

  return (
    <Link
      href={`/question-bank/set/${set.id}`}
      className="flex items-center gap-3 p-3.5 transition-colors duration-base hover:opacity-80"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[set.color]}`}>
        <span className="font-ui text-xs font-semibold">{set.questionCount}</span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate font-ui text-sm font-semibold text-primary">{set.name}</span>
        <span className="font-ui text-xs text-secondary">
          {set.categoryName ?? t("unfiled")} · {t("questionCount", { count: set.questionCount })}
        </span>
      </div>
      <div className="hidden shrink-0 sm:block">
        <DifficultyDots difficulty={set.difficulty} />
      </div>
      {set.yourScore !== null && (
        <div className="hidden w-24 shrink-0 items-center gap-2 sm:flex">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
            <div className="h-full rounded-full bg-accent" style={{ width: `${set.yourScore}%` }} />
          </div>
          <span className="font-ui text-xs text-secondary tabular-nums">{set.yourScore}%</span>
        </div>
      )}
      <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
    </Link>
  );
}
