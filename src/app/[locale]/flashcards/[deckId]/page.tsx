import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getDeckWithCards } from "@/lib/flashcards";
import { FlashcardReviewer } from "@/components/flashcards/FlashcardReviewer";
import { DeckWorkspace } from "@/components/flashcards/DeckWorkspace";
import { DeckIconEditor } from "@/components/flashcards/DeckIconEditor";
import { EditableDeckName } from "@/components/flashcards/EditableDeckName";

interface DeckPageProps {
  params: Promise<{ deckId: string }>;
}

// System decks resolve for anyone; a "user" deck only resolves for its
// owner (getDeckWithCards scopes the query by user_id) — a non-owner
// or signed-out visitor gets exactly the same 404 a forged/expired id
// would, not a leaked "deck exists but isn't yours" signal.
export default async function FlashcardDeckPage({ params }: DeckPageProps) {
  const { deckId } = await params;
  const session = await auth();
  const deck = await getDeckWithCards(deckId, session?.user.id ?? null);
  if (!deck) notFound();

  const t = await getTranslations("flashcards");
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  // If a "user" deck resolved at all, getDeckWithCards already proved
  // the caller is its owner (a non-owner gets null/404 above) — so
  // management access only needs an extra role check for the "system"
  // (preset) branch, where the deck itself has no single owning user.
  const canManage = deck.ownerType === "user" || isEditor;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Link
        href={deck.categoryId ? `/flashcards/category/${deck.categoryId}` : "/flashcards"}
        className="font-ui text-sm text-secondary hover:text-accent"
      >
        {t("backToDecks")}
      </Link>

      <div className="flex items-center gap-3">
        <DeckIconEditor
          deckId={deck.id}
          icon={deck.icon}
          iconUrl={deck.iconUrl}
          color={deck.color}
          canEdit={canManage}
          sizeClass="size-11"
          iconSizeClass="size-5"
        />
        <div>
          {canManage ? (
            <EditableDeckName deckId={deck.id} initialName={deck.name} />
          ) : (
            <h1 className="font-heading text-2xl text-primary">{deck.name}</h1>
          )}
          {deck.description && <p className="font-ui text-sm text-secondary">{deck.description}</p>}
        </div>
      </div>

      {canManage ? (
        <DeckWorkspace
          deckId={deck.id}
          initialCards={deck.cards}
          isSignedIn={Boolean(session)}
          lastCardId={deck.lastCardId}
          categoryColor={deck.categoryColor}
        />
      ) : (
        <FlashcardReviewer
          cards={deck.cards}
          isSignedIn={Boolean(session)}
          deckId={deck.id}
          lastCardId={deck.lastCardId}
          categoryColor={deck.categoryColor}
        />
      )}
    </main>
  );
}
