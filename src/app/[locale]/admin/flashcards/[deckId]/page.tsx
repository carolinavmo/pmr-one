import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getAdminDeckDetail } from "@/lib/flashcards-admin";
import { getCategories } from "@/lib/flashcards";
import { AdminDeckEditor } from "@/components/admin/AdminDeckEditor";

export default async function AdminFlashcardDeckPage({ params }: { params: Promise<{ deckId: string }> }) {
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

  const { deckId } = await params;
  const [detail, { systemCategories }] = await Promise.all([getAdminDeckDetail(deckId), getCategories(null)]);
  if (!detail) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
      <AdminDeckEditor deck={detail.deck} initialCards={detail.cards} categories={systemCategories} />
    </main>
  );
}
