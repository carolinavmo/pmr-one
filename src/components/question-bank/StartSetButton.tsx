"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { QuestionSetSummary } from "@/lib/question-bank";
import { restartSetAction } from "@/lib/actions/question-bank";

// A set with no attempts yet just gets a plain "Start" link — nothing
// to choose between. Once yourAttempts > 0 (only possible when signed
// in — SET_SUMMARY_SELECT_SIGNED_OUT always returns 0), offer
// "Continue" (plain navigation — QuestionRunner already resumes from
// the answered/unanswered mix on its own) alongside "Start over"
// (wipes this member's question_attempt rows for the set first, same
// "start fresh" idiom Flashcards' DeckCard uses).
export function StartSetButton({ set, variant }: { set: QuestionSetSummary; variant: "table" | "card" }) {
  const t = useTranslations("questionBank");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const href = `/question-bank/set/${set.id}`;

  function handleStartOver() {
    startTransition(async () => {
      await restartSetAction(set.id);
      router.push(href);
    });
  }

  if (set.yourAttempts === 0) {
    return (
      <Link
        href={href}
        className={
          variant === "table"
            ? "inline-block rounded-lg bg-accent px-3 py-1.5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
            : "mt-auto rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
        }
      >
        {t("start")}
      </Link>
    );
  }

  return (
    <div className={variant === "table" ? "flex items-center justify-end gap-2" : "mt-auto flex gap-2"}>
      <Link
        href={href}
        className={
          variant === "table"
            ? "inline-block rounded-lg bg-accent px-3 py-1.5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
            : "flex-1 rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
        }
      >
        {t("continue")}
      </Link>
      <button
        type="button"
        onClick={handleStartOver}
        disabled={isPending}
        className={
          variant === "table"
            ? "inline-block rounded-lg border border-border px-3 py-1.5 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-surface-raised disabled:opacity-70"
            : "flex-1 rounded-lg border border-border px-3 py-2 text-center font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-surface-sunken disabled:opacity-70"
        }
      >
        {t("startOver")}
      </button>
    </div>
  );
}
