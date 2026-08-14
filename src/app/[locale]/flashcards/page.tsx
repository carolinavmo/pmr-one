import { getTranslations } from "next-intl/server";
import { Layers, BookOpen, Repeat, CheckCircle2 } from "lucide-react";
import { auth } from "@/auth";
import { getDeckSummaries, getFavoritedDeckIds } from "@/lib/flashcards";
import { FlashcardsBrowser } from "@/components/flashcards/FlashcardsBrowser";

// Public browse (Clinical-Tools idiom, not Study-Planner's hard
// redirect) — preset decks are reference content anyone can look at
// and click through; only "My Decks" (creating/owning a deck) needs a
// session, same split clinical-tools/page.tsx uses for favorites.
export default async function FlashcardsPage() {
  const session = await auth();
  const { presetDecks, userDecks } = await getDeckSummaries(session?.user.id ?? null);
  const favoritedDeckIds = session ? await getFavoritedDeckIds(session.user.id) : new Set<string>();
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const t = await getTranslations("flashcards");

  const allDecks = [...presetDecks, ...userDecks];
  const totalCards = allDecks.reduce((sum, d) => sum + d.cardCount, 0);
  // In-progress/completed only mean something once there's a session
  // to score against (masteredCount is null otherwise) — shown as
  // real counts, never a fabricated zero for a signed-out visitor.
  const inProgress = allDecks.filter(
    (d) => d.masteredCount !== null && d.masteredCount > 0 && d.masteredCount < d.cardCount
  ).length;
  const completed = allDecks.filter(
    (d) => d.masteredCount !== null && d.cardCount > 0 && d.masteredCount === d.cardCount
  ).length;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Layers className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-reading text-3xl text-primary">{t("pageTitle")}</h1>
          <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile icon={Layers} value={allDecks.length} label={t("statsTotalDecks")} />
        <StatTile icon={BookOpen} value={totalCards} label={t("statsTotalCards")} />
        {session && (
          <>
            <StatTile icon={Repeat} value={inProgress} label={t("statsInProgress")} />
            <StatTile icon={CheckCircle2} value={completed} label={t("statsCompleted")} />
          </>
        )}
      </div>

      <FlashcardsBrowser
        presetDecks={presetDecks}
        userDecks={userDecks}
        favoritedDeckIds={favoritedDeckIds}
        isSignedIn={Boolean(session)}
        isEditor={isEditor}
      />
    </main>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Layers;
  value: number;
  label: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface-raised p-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col">
        <span className="font-heading text-xl font-semibold text-primary tabular-nums">{value}</span>
        <span className="font-ui text-xs text-secondary">{label}</span>
      </div>
    </div>
  );
}
