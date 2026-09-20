import { auth } from "@/auth";
import { NavbarFrame } from "./NavbarFrame";
import { MobileIndexDrawer } from "./MobileIndexDrawer";

// Thin async server wrapper — same split as Sidebar.tsx/SidebarFrame.tsx:
// `auth()` is server-only, everything interactive (active pill from
// the URL, the sticky-collapse scroll listener) needs the client. See
// NavbarFrame.tsx for the actual NAVBAR-SPEC.md build.
//
// `MobileIndexDrawer` is itself an async Server Component (fetches the
// topic tree) — a Client Component can't import and render one
// directly, only receive it as a prop/children from a Server
// Component ancestor, so it's rendered here and handed down.
export async function TopBar() {
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const isAdmin = session?.user.role === "admin";

  return (
    <NavbarFrame
      signedIn={Boolean(session)}
      userName={session?.user.name}
      userEmail={session?.user.email}
      userImage={session?.user.image}
      canReview={canReview}
      isAdmin={isAdmin}
      mobileIndexDrawer={<MobileIndexDrawer />}
    />
  );
}
