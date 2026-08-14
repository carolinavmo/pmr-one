import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getCategoryWithDecks, getDeckSummaries, getFavoritedDeckIds } from "@/lib/flashcards";
import { DeckCard } from "@/components/flashcards/DeckCard";
import { CategoryHeader } from "@/components/flashcards/CategoryHeader";
import { CategoryDeckManager } from "@/components/flashcards/CategoryDeckManager";

interface CategoryPageProps {
  params: Promise<{ categoryId: string }>;
}

// System folders are public browsing (same idiom as the deck grid
// itself); a user folder 404s for anyone but its owner (enforced in
// getCategoryWithDecks) — so if this page resolved a "user" category
// at all, the caller already IS its owner, same reasoning the deck
// detail page's canManage comment uses.
export default async function FlashcardCategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const session = await auth();
  const result = await getCategoryWithDecks(categoryId, session?.user.id ?? null);
  if (!result) notFound();
  const { category, decks } = result;

  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const canManage = category.ownerType === "user" || isEditor;
  const favoritedDeckIds = session ? await getFavoritedDeckIds(session.user.id) : new Set<string>();
  const t = await getTranslations("flashcards");

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

      <CategoryHeader category={category} canManage={canManage} />

      {canManage && (
        <CategoryDeckManager categoryId={category.id} decksInFolder={decks} assignableDecks={assignableDecks} />
      )}

      {decks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("noDecksInFolder")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              isFavorited={favoritedDeckIds.has(deck.id)}
              isSignedIn={Boolean(session)}
              canEdit={deck.ownerType === "user" || isEditor}
            />
          ))}
        </div>
      )}
    </main>
  );
}
