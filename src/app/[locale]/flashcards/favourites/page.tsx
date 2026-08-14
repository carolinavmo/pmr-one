import { getLocale, getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { redirect, Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getFavoritedDecks } from "@/lib/flashcards";
import { DeckCard } from "@/components/flashcards/DeckCard";

// Hard redirect (Study-Planner's idiom, not Clinical-Tools' public
// browse) — favourites are inherently a signed-in member's own data,
// there's nothing to show a visitor. Not a real folder — no
// CategoryHeader/CategoryDeckManager here, just a read-only deck grid
// over src/lib/flashcards.ts's getFavoritedDecks.
export default async function FlashcardFavouritesPage() {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const decks = await getFavoritedDecks(session.user.id);
  const isEditor = session.user.role === "editor" || session.user.role === "admin";
  const t = await getTranslations("flashcards");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-16">
      <Link href="/flashcards" className="font-ui text-sm text-secondary hover:text-accent">
        {t("backToDecks")}
      </Link>

      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card-yellow text-white">
          <Star className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-reading text-2xl text-primary">{t("favourites")}</h1>
          <p className="font-ui text-xs text-secondary">{t("deckCount", { count: decks.length })}</p>
        </div>
      </div>

      {decks.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("noFavourites")}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              isFavorited
              isSignedIn
              canEdit={deck.ownerType === "user" || isEditor}
            />
          ))}
        </div>
      )}
    </main>
  );
}
