import { getLocale } from "next-intl/server";
import { redirect, Link } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getAdminDeckList } from "@/lib/flashcards-admin";
import { getCategories } from "@/lib/flashcards";
import { AdminFlashcardsDeckList } from "@/components/admin/AdminFlashcardsDeckList";

// /admin/flashcards — Pass 5's deck list: "grouped by subject and
// topic, same separators as the reader's page." Same auth-gate shape
// every /admin/* page repeats (admin/page.tsx) — no shared layout to
// hook into yet in this app, so this is copied, not extracted.
export default async function AdminFlashcardsPage() {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }
  if (session.user.role !== "editor" && session.user.role !== "admin") {
    redirect({ href: "/login", locale });
    return;
  }

  const [decks, { systemCategories }] = await Promise.all([getAdminDeckList(), getCategories(null)]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-primary">Flashcards</h1>
          <p className="font-ui text-sm text-secondary">
            Library decks — draft, publish, and edit cards without resetting anyone&apos;s progress.
          </p>
        </div>
        <Link href="/admin/flashcards/card-health" className="shrink-0 font-ui text-xs font-bold text-accent hover:text-accent-hover">
          Card health →
        </Link>
      </div>
      <AdminFlashcardsDeckList decks={decks} categories={systemCategories} />
    </main>
  );
}
