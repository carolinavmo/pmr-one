"use client";

import { useTranslations, useFormatter } from "next-intl";
import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicDeckRow } from "@/lib/flashcards";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import { TopicStateBar } from "./TopicStateBar";

// "Deck rows: subject swatch, name (★ if favourite), '28 cards · from
// the library · studied yesterday', bar, percentage, and a button
// that names the action: Study 12 / Review early / Open."
// (FLASHCARDS-SPEC.md)
export function TopicDeckRowItem({ deck, topicColor, now }: { deck: TopicDeckRow; topicColor: TopicColor | null; now: Date | null }) {
  const t = useTranslations("flashcards");
  const format = useFormatter();

  const knownPercent = deck.cardCount === 0 ? 0 : Math.round((deck.knownCount / deck.cardCount) * 100);
  const subtitleParts = [
    t("cardCount", { count: deck.cardCount }),
    deck.sourceDiseaseName ? t("fromTheLibrary") : t("createdByYou"),
  ];
  if (deck.lastStudiedAt && now) subtitleParts.push(t("studiedRelative", { time: format.relativeTime(new Date(deck.lastStudiedAt), now) }));

  const action =
    deck.cardCount === 0 ? (
      <Link href={`/flashcards/${deck.id}`} className="rounded-lg border border-border px-3 py-1.5 font-ui text-xs font-bold text-primary hover:bg-border/30">
        {t("addCards")}
      </Link>
    ) : deck.dueCount > 0 ? (
      <Link href={`/flashcards/study?deck=${deck.id}`} className="rounded-lg bg-accent px-3 py-1.5 font-ui text-xs font-bold text-white hover:bg-accent-hover">
        {t("studyNDue", { count: deck.dueCount })}
      </Link>
    ) : (
      <Link
        href={`/flashcards/study?deck=${deck.id}&early=1`}
        className="rounded-lg border border-border px-3 py-1.5 font-ui text-xs font-bold text-primary hover:bg-border/30"
      >
        {t("reviewEarly")}
      </Link>
    );

  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-b-0">
      <span data-topic-color={topicColor ?? undefined} className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: topicColor ? "var(--topic)" : "var(--color-border)" }} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {deck.isFavorited && <Star className="size-3.5 shrink-0 fill-current text-card-yellow" aria-hidden="true" />}
          <Link href={`/flashcards/${deck.id}`} className="truncate font-ui text-sm font-bold text-primary hover:text-accent">
            {deck.name}
          </Link>
        </div>
        <p className="truncate font-ui text-xs text-secondary">{subtitleParts.join(" · ")}</p>
      </div>

      <div className="hidden w-32 shrink-0 sm:block">
        <TopicStateBar newCount={deck.newCount} learningCount={deck.learningCount} reviewCount={deck.reviewCount} topicColor={topicColor} height={6} />
      </div>

      <span className="w-10 shrink-0 text-right font-ui text-xs font-bold text-secondary">{knownPercent}%</span>

      {action}
    </div>
  );
}
