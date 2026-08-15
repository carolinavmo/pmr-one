"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { DeckSummary } from "@/lib/flashcards";
import { startDeckAction } from "@/lib/actions/flashcards";

// Shared between the grid tile (DeckCard) and the folder table
// (DeckTable) — same "Continue vs Start over" choice either way. A
// deck with no prior progress just gets a plain "Study deck" button;
// nothing to choose between. "Continue" is a plain navigation — box/
// due-date progress is per-card, not per-session, so there's nothing
// to resume beyond what's already stored. "Start over" wipes that
// progress first so the deck genuinely restarts instead of resuming
// mastered cards.
export function StartDeckButton({
  deck,
  isSignedIn,
  variant,
}: {
  deck: DeckSummary;
  isSignedIn: boolean;
  variant: "table" | "card";
}) {
  const t = useTranslations("flashcards");
  const router = useRouter();
  const [isStarting, startTransition] = useTransition();
  const href = `/flashcards/${deck.id}`;
  const hasProgress = isSignedIn && deck.startedCount !== null && deck.startedCount > 0;

  function handleContinue() {
    startTransition(async () => {
      router.push(href);
    });
  }

  function handleStartOver() {
    startTransition(async () => {
      await startDeckAction(deck.id);
      router.push(href);
    });
  }

  if (!hasProgress) {
    return (
      <button
        type="button"
        onClick={handleContinue}
        disabled={isStarting}
        className={
          variant === "table"
            ? "inline-block rounded-lg bg-accent px-3 py-1.5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover disabled:opacity-70"
            : "mt-auto rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover disabled:opacity-70"
        }
      >
        {t("studyDeck")}
      </button>
    );
  }

  return (
    <div className={variant === "table" ? "flex items-center justify-end gap-2" : "mt-auto flex gap-2"}>
      <button
        type="button"
        onClick={handleContinue}
        disabled={isStarting}
        className={
          variant === "table"
            ? "inline-block rounded-lg bg-accent px-3 py-1.5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover disabled:opacity-70"
            : "flex-1 rounded-lg bg-accent px-3 py-2 text-center font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover disabled:opacity-70"
        }
      >
        {t("continue")}
      </button>
      <button
        type="button"
        onClick={handleStartOver}
        disabled={isStarting}
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
