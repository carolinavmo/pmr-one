import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { getCalculatorCategories, getAllCalculators } from "@/lib/clinical-tools";
import { getFavoritedCalculatorIds } from "@/lib/workspace";
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
  const locale = await getLocale();
  const [tree, calculatorCategories, calculators, favoritedCalculatorIds] = await Promise.all([
    getTopicTree(canReview),
    getCalculatorCategories(),
    getAllCalculators(locale),
    session ? getFavoritedCalculatorIds(session.user.id) : Promise.resolve(new Set<string>()),
  ]);

  return (
    <SidebarFrame
      tree={tree}
      userName={session?.user.name}
      userEmail={session?.user.email}
      calculatorCategories={calculatorCategories}
      calculators={calculators}
      favoritedCalculatorIds={favoritedCalculatorIds}
    />
  );
}
