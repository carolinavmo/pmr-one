import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
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
  const tree = await getTopicTree(canReview);

  return (
    <SidebarFrame
      tree={tree}
      userName={session?.user.name}
      userEmail={session?.user.email}
      userRole={session?.user.role}
    />
  );
}
