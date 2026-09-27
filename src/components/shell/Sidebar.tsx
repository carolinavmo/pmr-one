import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { getFavoritedCalculatorIds } from "@/lib/workspace";
import { getDashboardTopicTiles, getLibraryTopicTiles, getCategories, getFolderDueBadges, getFavoritedDeckCount, getDueTodayCount } from "@/lib/flashcards";
import { getCategories as getQuestionBankCategories, getQuestionBankRailStats } from "@/lib/question-bank";
import { getPlannerRailStats, getPlans, rollForwardMissedTasks } from "@/lib/planner";
import { SidebarFrame } from "./SidebarFrame";

function todayIsoForRail(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Monday-start ISO week containing today — mirrors study-planner/
// page.tsx's own isoWeekBounds so getPlannerRailStats's request-scoped
// cache() actually hits (same args in, same call) rather than paying
// for the query twice.
function thisWeekEndIso(): string {
  const d = new Date();
  const day = d.getUTCDay();
  const monday = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  monday.setUTCDate(monday.getUTCDate() + ((day === 0 ? -6 : 1) - day));
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return sunday.toISOString().slice(0, 10);
}

// Site-wide persistent nav (desktop, `lg`+ — SidebarFrame handles the
// collapse toggle; the mobile equivalent is a slide-over drawer, not
// this component directly). Renders for every visitor now, signed in
// or not — the Index (topic tree) is real public reference content,
// not something gated behind an account the way the old
// signed-in-only Sidebar/Header split assumed. Drafts stay invisible
// to non-editors: `getTopicTree`'s `includeUnpublished` mirrors the
// exact same editor/admin check the disease page itself already uses.
export async function Sidebar() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const userId = session?.user.id ?? null;
  const locale = await getLocale();

  // PLANNER-IMPLEMENTATION.md Pass 5: "rolling forward runs once a
  // day." There's no scheduler infra in this app (see
  // rollForwardMissedTasks's own comment), so the nearest real
  // equivalent is running the sweep from the one component every
  // signed-in page already renders, rather than only from planner
  // pages — a user who opens Flashcards first thing in the morning
  // still gets today's overdue tasks rolled forward before the rail
  // reads them below. Individual planner pages keep their own call
  // too (idempotent, one indexed UPDATE) since render order between
  // this and a sibling page isn't guaranteed.
  if (userId) await rollForwardMissedTasks(userId);

  const [
    tree,
    calculatorCategories,
    calculators,
    favoritedCalculatorIds,
    dueToday,
    favoritedDeckCount,
    flashcardTopics,
    libraryTopics,
    { systemCategories },
    folderDueBadgesMap,
    questionBankCategories,
    questionBankRailStats,
    plannerRailStats,
    plannerPlans,
  ] = await Promise.all([
    getTopicTree(canReview),
    getCalculatorCategories(),
    getAllCalculators(locale),
    session ? getFavoritedCalculatorIds(session.user.id) : Promise.resolve(new Set<string>()),
    getDueTodayCount(userId),
    getFavoritedDeckCount(userId),
    getDashboardTopicTiles(userId),
    getLibraryTopicTiles(userId),
    getCategories(userId),
    getFolderDueBadges(userId),
    getQuestionBankCategories(),
    getQuestionBankRailStats(userId),
    session ? getPlannerRailStats(session.user.id, todayIsoForRail(), thisWeekEndIso()) : Promise.resolve(null),
    session ? getPlans(session.user.id, "active") : Promise.resolve([]),
  ]);

  return (
    <SidebarFrame
      tree={tree}
      userName={session?.user.name}
      userEmail={session?.user.email}
      calculatorCategories={calculatorCategories}
      calculators={calculators}
      favoritedCalculatorIds={favoritedCalculatorIds}
      flashcardsDueToday={dueToday}
      flashcardsFavoritedCount={favoritedDeckCount}
      flashcardsTopics={flashcardTopics}
      flashcardsLibraryTopics={libraryTopics}
      flashcardsSystemCategories={systemCategories}
      flashcardsFolderDueBadges={Object.fromEntries(folderDueBadgesMap)}
      questionBankCategories={questionBankCategories}
      questionBankRailStats={questionBankRailStats}
      plannerRailStats={plannerRailStats}
      plannerPlans={plannerPlans}
      isEditor={canReview}
    />
  );
}
