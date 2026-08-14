import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { getDeckSummaries } from "@/lib/flashcards";
import { DeckGrid } from "@/components/flashcards/DeckGrid";
import { MyDecksSection } from "@/components/flashcards/MyDecksSection";
import { Link } from "@/i18n/navigation";

// Public browse (Clinical-Tools idiom, not Study-Planner's hard
// redirect) — preset decks are reference content anyone can look at
// and click through; only "My Decks" (creating/owning a deck) needs a
// session, same split clinical-tools/page.tsx uses for favorites.
export default async function FlashcardsPage() {
  const session = await auth();
  const { presetDecks, userDecks } = await getDeckSummaries(session?.user.id ?? null);
  const t = await getTranslations("flashcards");

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="font-reading text-3xl text-primary">{t("pageTitle")}</h1>
        <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="font-heading text-lg font-semibold text-primary">{t("presetDecksHeading")}</h2>
        <DeckGrid decks={presetDecks} />
      </div>

      {session ? (
        <MyDecksSection decks={userDecks} />
      ) : (
        <div className="flex flex-col gap-4">
          <h2 className="font-heading text-lg font-semibold text-primary">{t("myDecksHeading")}</h2>
          <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-raised p-6 text-center">
            <p className="font-ui text-sm text-secondary">{t("signInToCreateDecks")}</p>
            <Link href="/login" className="font-ui text-sm font-medium text-accent hover:underline">
              {t("signInLink")}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
