import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { MobileIndexDrawerFrame } from "./MobileIndexDrawerFrame";

// Server half of the mobile Index trigger — same session-gated tree
// fetch Sidebar.tsx does, kept separate since the two live in
// unrelated branches of AppShell (Sidebar vs. TopBar).
export async function MobileIndexDrawer() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const tree = await getTopicTree(canReview);

  return <MobileIndexDrawerFrame tree={tree} />;
}
