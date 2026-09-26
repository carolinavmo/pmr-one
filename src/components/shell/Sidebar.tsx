import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { getFavoritedCalculatorIds } from "@/lib/workspace";
import { getDashboardTopicTiles, getLibraryTopicTiles, getCategories, getFolderDueBadges, getFavoritedDeckCount, getDueTodayCount } from "@/lib/flashcards";
import { getCategories as getQuestionBankCategories, getQuestionBankRailStats } from "@/lib/question-bank";
import { SidebarFrame } from "./SidebarFrame";

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
      isEditor={canReview}
    />
  );
}
