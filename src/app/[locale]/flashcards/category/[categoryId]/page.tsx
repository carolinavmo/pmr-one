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

// Folders are public browsing (same idiom as the deck grid itself) —
// only the management controls (rename/recolor/delete/assign) are
// editor-gated, not the page's visibility.
export default async function FlashcardCategoryPage({ params }: CategoryPageProps) {
  const { categoryId } = await params;
  const session = await auth();
  const result = await getCategoryWithDecks(categoryId, session?.user.id ?? null);
  if (!result) notFound();
  const { category, decks } = result;

  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const favoritedDeckIds = session ? await getFavoritedDeckIds(session.user.id) : new Set<string>();
  const t = await getTranslations("flashcards");

  // Only fetched for an editor building the "add deck to folder"
  // picker — a plain visitor never needs the full preset-deck list.
  let assignableDecks: typeof decks = [];
  if (isEditor) {
    const { presetDecks } = await getDeckSummaries(session?.user.id ?? null);
    assignableDecks = presetDecks.filter((deck) => deck.categoryId !== category.id);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <Link href="/flashcards" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToDecks")}
      </Link>

      <CategoryHeader category={category} canManage={isEditor} />

      {isEditor && (
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
