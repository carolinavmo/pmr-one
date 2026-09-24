"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { WeakCard } from "@/lib/flashcards";

// "Weak cards are shown as questions, not ids — that is what makes
// the list actionable." (FLASHCARDS-SPEC.md rule 4) Ranked by lapses
// in the last 7 days (getTopicWeakCards). "Study" opens that card's
// whole deck (there's no single-card session builder yet — see the
// Pass 3 report) rather than isolating just this one question.
export function TopicWeakCards({ cards }: { cards: WeakCard[] }) {
  const t = useTranslations("flashcards");
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <h2 className="font-ui text-sm font-black text-navy">{t("fixTheseFirst")}</h2>
      <div className="flex flex-col divide-y divide-border">
        {cards.map((card) => (
          <div key={card.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-ui text-sm font-semibold text-primary">{card.question}</p>
              <p className="font-ui text-xs text-secondary">{t("lapsesCount", { count: card.lapses, deck: card.deckName })}</p>
            </div>
            <Link href={`/flashcards/${card.deckId}`} className="shrink-0 rounded-lg border border-border px-2.5 py-1 font-ui text-xs font-bold text-primary hover:bg-border/30">
              {t("editCard")}
            </Link>
            <Link href={`/flashcards/study?deck=${card.deckId}&early=1`} className="shrink-0 rounded-lg bg-accent px-2.5 py-1 font-ui text-xs font-bold text-white hover:bg-accent-hover">
              {t("studyDeck")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
