import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Layers } from "lucide-react";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { getDeckWithCards } from "@/lib/flashcards";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import { FlashcardReviewer } from "@/components/flashcards/FlashcardReviewer";
import { DeckWorkspace } from "@/components/flashcards/DeckWorkspace";

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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-16">
      <Link href="/flashcards" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToDecks")}
      </Link>

      <div className="flex items-center gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[deck.color]}`}>
          <Layers className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-reading text-2xl text-primary">{deck.name}</h1>
          {deck.description && <p className="font-ui text-sm text-secondary">{deck.description}</p>}
        </div>
      </div>

      {deck.ownerType === "user" ? (
        <DeckWorkspace
          deckId={deck.id}
          initialCards={deck.cards}
          isSignedIn={Boolean(session)}
          sourceDiseaseName={deck.sourceDiseaseName}
          sourceDiseaseSlug={deck.sourceDiseaseSlug}
        />
      ) : (
        <FlashcardReviewer
          cards={deck.cards}
          isSignedIn={Boolean(session)}
          sourceDiseaseName={deck.sourceDiseaseName}
          sourceDiseaseSlug={deck.sourceDiseaseSlug}
        />
      )}
    </main>
  );
}
