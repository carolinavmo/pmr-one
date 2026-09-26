import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import {
  getStudyCardsForDeck,
  getStudyCardsForCategory,
  getStudyCardsForAccount,
  getNewStudyCardsForAccount,
  getDueOnlyStudyCardsForAccount,
  getWeakStudyCardsForCategory,
  getDeckCategoryId,
} from "@/lib/flashcards";
import { StudySession } from "@/components/flashcards/StudySession";

interface StudyPageProps {
  searchParams: Promise<{ deck?: string; topic?: string; early?: string; weak?: string; new?: string; due?: string }>;
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

  const { deck: deckId, topic: categoryId, early, weak, new: newOnly, due: dueOnly } = await searchParams;
  const includeNotDue = early === "1";

  const cards =
    newOnly === "1"
      ? await getNewStudyCardsForAccount(session.user.id)
      : dueOnly === "1"
        ? await getDueOnlyStudyCardsForAccount(session.user.id)
        : categoryId && weak === "1"
          ? await getWeakStudyCardsForCategory(session.user.id, categoryId)
          : deckId
            ? await getStudyCardsForDeck(session.user.id, deckId, includeNotDue)
            : categoryId
              ? await getStudyCardsForCategory(session.user.id, categoryId, includeNotDue)
              : await getStudyCardsForAccount(session.user.id, includeNotDue);
  if (cards === null) notFound();

  // A deck-scoped session (?deck=) used to send "Back" to the deck's own
  // /flashcards/[deckId] page — the old box-based reviewer, not anywhere
  // showing the new ring/state-bar the user just finished updating. When
  // the deck belongs to a topic, prefer the topic page instead — the
  // deck still shows there as a row. Looked up directly (not read off
  // `cards`) since `cards` is empty whenever nothing is due, which is
  // exactly the state right after finishing the deck. Only an unfiled
  // personal deck (no category) falls back to its own page, since
  // there's no topic to return to.
  const deckCategoryId = deckId ? await getDeckCategoryId(deckId) : null;
  const backHref = deckCategoryId
    ? `/flashcards/category/${deckCategoryId}`
    : deckId
      ? `/flashcards/${deckId}`
      : categoryId
        ? `/flashcards/category/${categoryId}`
        : "/flashcards";
  return <StudySession initialCards={cards} backHref={backHref} />;
}
