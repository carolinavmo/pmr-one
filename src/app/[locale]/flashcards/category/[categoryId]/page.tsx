import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Lock } from "lucide-react";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import {
  getCategoryWithDecks,
  getDeckSummaries,
  getTopicDeckRows,
  getTopicMetrics,
  getTopicWeakCards,
  getTopicAllCards,
  type FlashcardCategory,
  type DeckSummary,
} from "@/lib/flashcards";
import { TopicPageClient } from "@/components/flashcards/TopicPageClient";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

// System folders are public browsing (same idiom as the deck grid
// itself); a user folder 404s for anyone but its owner (enforced in
// getCategoryWithDecks) — so if this page resolved a "user" category
// at all, the caller already IS its owner, same reasoning the deck
// detail page's canManage comment uses.
//
// FLASHCARDS-IMPLEMENTATION.md Pass 3 — "the topic page." A
// flashcard_category row IS the topic (Pass 1's own finding), so this
// rebuilds the existing /flashcards/category/:id route in place
// rather than forking a parallel /flashcards/topic/:id that would
// need every existing link (the rail, "My folders", the dashboard
// tiles) re-pointed at it.
export default async function FlashcardCategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const session = await auth();
  const result = await getCategoryWithDecks(categoryId, session?.user.id ?? null);
  if (!result) notFound();
  const { category, decks } = result;

  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const canManage = category.ownerType === "user" || isEditor;
  const canBrowseFolder = category.isPublic || Boolean(session);
  const t = await getTranslations("flashcards");
  const tCommon = await getTranslations("common");
  const tAuth = await getTranslations("auth");

  // Only fetched when the caller can manage this folder, to build the
  // "add deck to folder" picker — a plain visitor never needs it. A
  // system folder draws assignable decks from all preset decks; a
  // user folder draws from that same member's own decks only.
  let assignableDecks: typeof decks = [];
  if (canManage) {
    const { presetDecks, userDecks } = await getDeckSummaries(session?.user.id ?? null);
    const pool = category.ownerType === "system" ? presetDecks : userDecks;
    assignableDecks = pool.filter((deck) => deck.categoryId !== category.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <Link href="/flashcards" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToDecks")}
      </Link>

      {!canBrowseFolder ? (
        <div className="flex items-start gap-3 rounded-xl border border-insight/30 bg-insight/5 p-4">
          <Lock className="mt-0.5 size-5 shrink-0 text-insight" aria-hidden="true" />
          <div className="flex flex-col gap-2">
            <h3 className="font-ui text-sm font-semibold text-primary">{t("membersOnlyHeading")}</h3>
            <p className="font-ui text-sm text-secondary">{t("membersOnlyBody")}</p>
            <div className="mt-1 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent-hover"
              >
                {tCommon("signIn")}
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-border px-4 py-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-border/20"
              >
                {tAuth("createAccountButton")}
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <TopicPageBody category={category} decks={decks} canManage={canManage} assignableDecks={assignableDecks} userId={session?.user.id ?? null} />
      )}
    </main>
  );
}

async function TopicPageBody({
  category,
  decks,
  canManage,
  assignableDecks,
  userId,
}: {
  category: FlashcardCategory;
  decks: DeckSummary[];
  canManage: boolean;
  assignableDecks: DeckSummary[];
  userId: string | null;
}) {
  const deckRows = await getTopicDeckRows(userId, category.id);
  const cardCount = deckRows.reduce((sum, d) => sum + d.cardCount, 0);
  const [metrics, weakCards, allCards] = userId
    ? await Promise.all([getTopicMetrics(userId, category.id), getTopicWeakCards(userId, category.id), getTopicAllCards(userId, category.id)])
    : [null, [], null];

  return (
    <TopicPageClient
      category={category}
      deckRows={deckRows}
      cardCount={cardCount}
      allCards={allCards}
      metrics={metrics}
      weakCards={weakCards}
      canManage={canManage}
      decksInFolder={decks}
      assignableDecks={assignableDecks}
    />
  );
}
