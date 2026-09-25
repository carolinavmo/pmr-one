"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TopicTile } from "@/lib/flashcards";
import { TopicStateBar } from "./TopicStateBar";

// "Progress by topic" (FLASHCARDS-SPEC.md) — the same topics as the
// tiles above (library + your topics + the virtual "My decks" bucket),
// as rows instead: "a second way into a topic... this is what
// replaces the tiles as the way in, so it must stay." Each row is a
// plain link, same destination the tile above it already opens.
export function ProgressByTopicRows({ topics }: { topics: TopicTile[] }) {
  const t = useTranslations("flashcards");
  if (topics.length === 0) return null;

  const sorted = [...topics].sort((a, b) => {
    if (a.isFavorited !== b.isFavorited) return a.isFavorited ? -1 : 1;
    if (a.dueCount !== b.dueCount) return b.dueCount - a.dueCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("progressByTopic")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">{t("topicCount", { count: sorted.length })}</span>
      </div>

      <div className="mt-2.5 flex items-center gap-3 font-ui text-[11px] font-bold text-secondary">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#E8564B" }} />
          {t("libraryTopicNotStarted")}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#0E9BA6" }} />
          {t("studyStateLearning")}
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full" style={{ backgroundColor: "#4FBF86" }} />
          {t("known")}
        </span>
      </div>

      <div className="mt-2.5 flex flex-col gap-2">
        {sorted.map((topic) => {
          const percent = topic.cardCount === 0 ? 0 : Math.round((topic.knownCount / topic.cardCount) * 100);
          return (
            <Link
              key={topic.id}
              href={topic.id === "unfiled" ? "#your-decks" : `/flashcards/category/${topic.id}`}
              className="flex items-center gap-3.5 rounded-xl border border-border p-3.5 hover:border-accent/40"
            >
              <span data-topic-color={topic.topicColor ?? undefined} className="h-9 w-2.5 shrink-0 rounded-[5px]" style={{ backgroundColor: topic.topicColor ? "var(--topic)" : "var(--color-border)" }} />

              <div className="w-[150px] shrink-0 sm:w-[170px]">
                <p className="truncate font-ui text-sm font-black text-navy">{topic.name}</p>
                <p className="font-ui text-[11px] font-bold text-secondary">{t("deckAndCardCount", { decks: topic.deckCount, cards: topic.cardCount })}</p>
              </div>

              <div className="hidden flex-1 sm:block">
                <TopicStateBar newCount={topic.newCount} learningCount={topic.learningCount} reviewCount={topic.reviewCount} knownCount={topic.knownCount} topicColor={topic.topicColor} height={10} />
              </div>

              <span className="w-11 shrink-0 text-right font-ui text-sm font-black text-navy">{percent}%</span>

              <span className="w-[68px] shrink-0 text-right font-ui text-[11.5px] font-black" style={{ color: topic.dueCount > 0 ? "#B8262B" : "var(--color-trust)" }}>
                {topic.dueCount > 0 ? t("dueCount", { count: topic.dueCount }) : t("studyUpToDate")}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
