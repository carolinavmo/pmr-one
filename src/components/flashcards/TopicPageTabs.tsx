"use client";

import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { DeckSummary, FlashcardCategory, TopicDeckRow, TopicCardRow, TopicMetrics } from "@/lib/flashcards";
import type { TopicColor } from "@/lib/flashcard-topic-colors";
import { CategoryDeckManager } from "./CategoryDeckManager";
import { TopicDeckRowItem } from "./TopicDeckRowItem";
import { TopicSettingsPanel } from "./TopicSettingsPanel";
import { KnownPercentRing } from "./KnownPercentRing";
import { TopicStateBar } from "./TopicStateBar";
import { richTextToPlainText } from "@/lib/rich-text";

export type TopicTab = "decks" | "allCards" | "statistics" | "settings";

export function TopicPageTabs({
  category,
  topicColor,
  deckRows,
  allCards,
  metrics,
  canManage,
  decksInFolder,
  assignableDecks,
  onTopicColorChanged,
  onRenamed,
  onNewDeckClick,
  tab,
  onTabChange,
  now,
}: {
  category: FlashcardCategory;
  topicColor: TopicColor | null;
  deckRows: TopicDeckRow[];
  allCards: TopicCardRow[] | null;
  metrics: TopicMetrics | null;
  canManage: boolean;
  decksInFolder: DeckSummary[];
  assignableDecks: DeckSummary[];
  onTopicColorChanged: (color: TopicColor) => void;
  onRenamed: (name: string) => void;
  onNewDeckClick: () => void;
  tab: TopicTab;
  onTabChange: (tab: TopicTab) => void;
  now: Date | null;
}) {
  const t = useTranslations("flashcards");

  const tabs: { key: TopicTab; label: string }[] = [
    { key: "decks", label: `${t("tabDecks")} · ${deckRows.length}` },
    { key: "allCards", label: allCards ? `${t("tabAllCards")} · ${allCards.length}` : t("tabAllCards") },
    { key: "statistics", label: t("tabStatistics") },
    ...(canManage ? [{ key: "settings" as TopicTab, label: t("tabSettings") }] : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tabDef) => (
          <button
            key={tabDef.key}
            type="button"
            onClick={() => onTabChange(tabDef.key)}
            className={`border-b-2 px-3 py-2 font-ui text-sm font-bold ${
              tab === tabDef.key ? "border-accent text-accent" : "border-transparent text-secondary hover:text-primary"
            }`}
          >
            {tabDef.label}
          </button>
        ))}
      </div>

      {tab === "decks" && (
        <div className="flex flex-col gap-4">
          {canManage && <CategoryDeckManager categoryId={category.id} decksInFolder={decksInFolder} assignableDecks={assignableDecks} />}

          <h2 className="font-heading text-lg font-black text-navy">{t("tabDecks")}</h2>

          {deckRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">{t("noDecksInFolder")}</p>
          ) : (
            <div className="rounded-xl border border-border bg-surface px-4">
              {deckRows.map((deck) => (
                <TopicDeckRowItem key={deck.id} deck={deck} topicColor={topicColor} now={now} />
              ))}
            </div>
          )}

          {canManage && (
            <button
              type="button"
              onClick={onNewDeckClick}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2.5 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
            >
              <Plus className="size-4" aria-hidden="true" />
              {t("newDeckInTopic", { name: category.name })}
            </button>
          )}
        </div>
      )}

      {tab === "allCards" && (
        <div className="rounded-xl border border-border bg-surface px-4">
          {!allCards || allCards.length === 0 ? (
            <p className="py-6 text-center font-ui text-sm text-secondary">{t("noDecksInFolder")}</p>
          ) : (
            allCards.map((card) => (
              <div key={card.id} className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
                <p className="min-w-0 flex-1 truncate font-ui text-sm text-primary">{richTextToPlainText(card.question)}</p>
                <span className="shrink-0 font-ui text-xs text-secondary">{card.deckName}</span>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 font-ui text-[10px] font-bold tracking-wide uppercase ${
                    card.state === "new" ? "bg-[#FDF0EF] text-[#E8564B]" : card.state === "learning" ? "bg-acc-bg text-acc-ink" : "bg-[#EDF9F2] text-[#1F7A4D]"
                  }`}
                >
                  {card.state === "new" ? t("studyStateNew") : card.state === "learning" ? t("studyStateLearning") : t("studyStateReview")}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "statistics" && (
        <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-5">
          {!metrics ? (
            <p className="font-ui text-sm text-secondary">{t("signInForStats")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-6">
                <KnownPercentRing percent={metrics.knownPercent} size={96} sublabel={t("known")} topicColor={topicColor ?? undefined} />
                <div className="flex flex-1 flex-col gap-3">
                  <TopicStateBar
                    newCount={deckRows.reduce((sum, d) => sum + d.newCount, 0)}
                    learningCount={deckRows.reduce((sum, d) => sum + d.learningCount, 0)}
                    reviewCount={deckRows.reduce((sum, d) => sum + d.reviewCount, 0)}
                    knownCount={deckRows.reduce((sum, d) => sum + d.knownCount, 0)}
                    topicColor={topicColor}
                    showLegend
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-4 sm:grid-cols-3">
                <div>
                  <p className="font-heading text-lg font-black text-navy">{metrics.retentionPercent === null ? "—" : `${metrics.retentionPercent}%`}</p>
                  <p className="font-ui text-xs text-secondary">{t("retentionHere")}</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-black text-navy">{metrics.lapsesThisWeek}</p>
                  <p className="font-ui text-xs text-secondary">{t("lapsesThisWeek")}</p>
                </div>
                <div>
                  <p className="font-heading text-lg font-black text-navy">{metrics.dueToday}</p>
                  <p className="font-ui text-xs text-secondary">{t("dueToday")}</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "settings" && canManage && (
        <TopicSettingsPanel category={category} onRenamed={onRenamed} onTopicColorChanged={onTopicColorChanged} />
      )}
    </div>
  );
}
