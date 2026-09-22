import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { getFavoritedCalculatorIds } from "@/lib/workspace";
import { MobileIndexDrawerFrame } from "./MobileIndexDrawerFrame";

// Server half of the mobile Index trigger — same session-gated tree
// fetch Sidebar.tsx does, kept separate since the two live in
// unrelated branches of AppShell (Sidebar vs. TopBar). Also fetches
// the clinical-tools sidebar data unconditionally, same reasoning as
// Sidebar.tsx (no server-side route awareness without middleware —
// see ClinicalToolsSidebar.tsx's own comment); MobileIndexDrawerFrame
// picks which one to actually render.
export async function MobileIndexDrawer() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const locale = await getLocale();
  const [tree, calculatorCategories, calculators, favoritedCalculatorIds] = await Promise.all([
    getTopicTree(canReview),
    getCalculatorCategories(),
    getAllCalculators(locale),
    session ? getFavoritedCalculatorIds(session.user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <MobileIndexDrawerFrame
      tree={tree}
      isSignedIn={Boolean(session)}
      calculatorCategories={calculatorCategories}
      calculators={calculators}
      favoritedCalculatorIds={favoritedCalculatorIds}
    />
  );
}
