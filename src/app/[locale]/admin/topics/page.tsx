import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getTopicTree } from "@/lib/topics";
import { TopicManager } from "@/components/admin/TopicManager";

// Gated to `role === "admin"` specifically — stricter than the
// review-queue's own editor-or-admin check, since this manages the
// site-wide navigation taxonomy every visitor sees, not one disease's
// publish state.
export default async function AdminTopicsPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    // See the matching comment in account/page.tsx — the extra
    // `return` works around a TS narrowing gap with destructured
    // `never`-returning functions.
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "admin") {
    redirect({ href: "/admin", locale });
    return;
  }

  const tree = await getTopicTree(true);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-16">
      <div>
        <h1 className="font-reading text-2xl text-primary">Manage topics</h1>
        <p className="mt-1 font-ui text-sm text-secondary">
          Rename, reorder, re-parent, recolor, and add or remove branches of the Explore sidebar.
          Changes apply site-wide immediately.
        </p>
      </div>

      <TopicManager tree={tree} />
    </main>
  );
}
