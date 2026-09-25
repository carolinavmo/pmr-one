import { auth } from "@/auth";
import {
  getDashboardDeckRows,
  getDashboardMetrics,
  getSevenDayForecast,
  getCategories,
  getDashboardTopicTiles,
  getLibraryTopicTiles,
  groupLibraryTopicsBySubject,
  getDashboardProgress,
} from "@/lib/flashcards";
import { FlashcardsDashboard } from "@/components/flashcards/FlashcardsDashboard";

// Public browse (Clinical-Tools idiom, not Study-Planner's hard
// redirect) — preset decks are reference content anyone can look at;
// only the personal layer (streak, retention, the session panel, due
// badges) needs a session, same split the pre-Pass-4 page used for its
// stat tiles.
//
// FLASHCARDS-IMPLEMENTATION.md Pass 4 — the dashboard. todayYmd here
// is the server's own UTC calendar day, not the user's local one
// (unlike StudySession.tsx's client-computed Intl "en-CA" day) — a
// deliberate simplification: streak/forecast day-bucketing can be off
// by one for a user far from UTC only in the hours around their local
// midnight, self-corrects on the next page load, and every other
// figure on this page (due counts, retention) reads off absolute
// timestamps rather than a day string.
export default async function FlashcardsPage() {
  const session = await auth();
  const userId = session?.user.id ?? null;
  const isEditor = session?.user.role === "editor" || session?.user.role === "admin";
  const todayYmd = new Date().toISOString().slice(0, 10);

  const [deckRows, { systemCategories, userCategories }, metrics, forecast, topics, libraryTopics, progress] = await Promise.all([
    getDashboardDeckRows(userId),
    getCategories(userId),
    userId ? getDashboardMetrics(userId, todayYmd) : null,
    userId ? getSevenDayForecast(userId, todayYmd) : Promise.resolve([]),
    getDashboardTopicTiles(userId),
    getLibraryTopicTiles(userId),
    userId ? getDashboardProgress(userId, todayYmd) : null,
  ]);

  const libraryGroups = groupLibraryTopicsBySubject(libraryTopics);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col px-6 py-16">
      <FlashcardsDashboard
        metrics={metrics}
        forecast={forecast}
        deckRows={deckRows}
        topics={topics}
        libraryTopics={libraryTopics}
        libraryGroups={libraryGroups}
        progress={progress}
        systemCategories={systemCategories}
        userCategories={userCategories}
        isSignedIn={Boolean(session)}
        isEditor={isEditor}
      />
    </main>
  );
}
