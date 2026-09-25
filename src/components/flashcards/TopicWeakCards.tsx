"use client";

import { useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { WeakCard } from "@/lib/flashcards";
import { richTextToPlainText } from "@/lib/rich-text";

// "Weak cards are shown as questions, not ids — that is what makes
// the list actionable." (FLASHCARDS-SPEC.md rule 4) Ranked by lapses
// in the last 7 days (getTopicWeakCards). "Study these N" builds a
// real session over exactly this set (getWeakStudyCardsForCategory —
// same ranking, same limit), so reviewing "only the weak ones" is a
// real study session, not just a link to each card's whole deck.
// Per-row "Study" still opens that one card's deck (there's no
// single-card session builder) — the bulk action is what's new here.
export function TopicWeakCards({ cards, categoryId }: { cards: WeakCard[]; categoryId: string }) {
  const t = useTranslations("flashcards");
  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="font-heading text-lg font-black text-navy">{t("fixTheseFirst")}</h2>
          <span className="font-ui text-xs font-bold text-secondary">{t("weakCardsCount", { count: cards.length })}</span>
        </div>
        <Link
          href={`/flashcards/study?topic=${categoryId}&weak=1`}
          className="flex shrink-0 items-center gap-0.5 font-ui text-xs font-bold text-acc-ink hover:underline"
        >
          {t("studyTheseWeak", { count: cards.length })}
          <ChevronRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {cards.map((card) => (
          <div key={card.id} className="flex items-center gap-3 py-2.5">
            <span aria-hidden="true" className="h-8 w-1.5 shrink-0 rounded-full bg-[#E8564B]" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-ui text-sm font-semibold text-primary">&ldquo;{richTextToPlainText(card.question)}&rdquo;</p>
              <p className="font-ui text-xs text-secondary">{t("failedNTimes", { deck: card.deckName, count: card.lapses })}</p>
            </div>
            <Link href={`/flashcards/${card.deckId}`} className="shrink-0 rounded-lg border border-border px-2.5 py-1 font-ui text-xs font-bold text-primary hover:bg-border/30">
              {t("weakCardEdit")}
            </Link>
            <Link href={`/flashcards/study?deck=${card.deckId}&early=1`} className="shrink-0 rounded-lg bg-accent px-2.5 py-1 font-ui text-xs font-bold text-white hover:bg-accent-hover">
              {t("weakCardStudy")}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
