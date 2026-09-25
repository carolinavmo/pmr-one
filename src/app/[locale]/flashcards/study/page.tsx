import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { getStudyCardsForDeck, getStudyCardsForCategory, getStudyCardsForAccount, getWeakStudyCardsForCategory } from "@/lib/flashcards";
import { StudySession } from "@/components/flashcards/StudySession";

interface StudyPageProps {
  searchParams: Promise<{ deck?: string; topic?: string; early?: string; weak?: string }>;
}

// FLASHCARDS-IMPLEMENTATION.md Pass 2 — "Route /flashcards/study?deck=…
// or ?topic=…, with no navbar and no sidebar" (the chrome opt-out
// lives in NavbarFrame.tsx/SidebarFrame.tsx, keyed off this same
// path). Signed-in only — every number this screen shows (remaining
// counts, the grading intervals, streak) is this user's own SM-2
// progress; there's no meaningful anonymous version of it the way the
// old inline reviewer allowed.
export default async function FlashcardsStudyPage({ searchParams }: StudyPageProps) {
  const session = await auth();
  if (!session) {
    redirect({ href: "/login", locale: await getLocale() });
    return;
  }

  const { deck: deckId, topic: categoryId, early, weak } = await searchParams;
  const includeNotDue = early === "1";

  const cards =
    categoryId && weak === "1"
      ? await getWeakStudyCardsForCategory(session.user.id, categoryId)
      : deckId
        ? await getStudyCardsForDeck(session.user.id, deckId, includeNotDue)
        : categoryId
          ? await getStudyCardsForCategory(session.user.id, categoryId, includeNotDue)
          : await getStudyCardsForAccount(session.user.id, includeNotDue);
  if (cards === null) notFound();

  const backHref = deckId ? `/flashcards/${deckId}` : categoryId ? `/flashcards/category/${categoryId}` : "/flashcards";
  return <StudySession initialCards={cards} backHref={backHref} />;
}
