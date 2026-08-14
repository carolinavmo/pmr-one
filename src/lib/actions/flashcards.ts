"use server";

import { auth } from "@/auth";
import { revalidateFlashcardSurfaces } from "@/lib/revalidation";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  createDeck,
  renameDeck,
  updateDeckColor,
  deleteDeck,
  reorderDecks,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  recordReview,
  type DeckSummary,
  type FlashcardCard,
} from "@/lib/flashcards";

// Every signed-in member can create/edit their own decks — no role
// check, same shape as atlas.ts's requireUserId (not authoring.ts's
// requireEditor(), which is for admin-authored disease content).
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createDeckAction(name: string, color: CardColor): Promise<DeckSummary> {
  const userId = await requireUserId();
  const deck = await createDeck(userId, name.trim() || "Untitled deck", color);
  revalidateFlashcardSurfaces();
  return deck;
}

export async function renameDeckAction(deckId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await renameDeck(userId, deckId, name.trim() || "Untitled deck");
  revalidateFlashcardSurfaces();
}

export async function updateDeckColorAction(deckId: string, color: CardColor): Promise<void> {
  const userId = await requireUserId();
  await updateDeckColor(userId, deckId, color);
  revalidateFlashcardSurfaces();
}

export async function deleteDeckAction(deckId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteDeck(userId, deckId);
  revalidateFlashcardSurfaces();
}

export async function reorderDecksAction(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await reorderDecks(userId, orderedIds);
  revalidateFlashcardSurfaces();
}

export async function createCardAction(
  deckId: string,
  question: string,
  answer: string
): Promise<FlashcardCard | null> {
  const userId = await requireUserId();
  const card = await createCard(userId, deckId, question.trim(), answer.trim());
  revalidateFlashcardSurfaces();
  return card;
}

export async function updateCardAction(cardId: string, question: string, answer: string): Promise<void> {
  const userId = await requireUserId();
  await updateCard(userId, cardId, question.trim(), answer.trim());
  revalidateFlashcardSurfaces();
}

export async function deleteCardAction(cardId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteCard(userId, cardId);
  revalidateFlashcardSurfaces();
}

export async function reorderCardsAction(deckId: string, orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await reorderCards(userId, deckId, orderedIds);
  revalidateFlashcardSurfaces();
}

// Fire-and-forget from the client (the reviewer already advances
// optimistically in local state) — same idiom as TaskRow.tsx's
// toggleTaskCompleteAction, no useTransition needed. Revalidates so the
// deck grid's mastery progress bar is correct on the next visit, but
// doesn't block the reviewer UI on it.
export async function recordReviewAction(flashcardId: string, knew: boolean): Promise<void> {
  const userId = await requireUserId();
  await recordReview(userId, flashcardId, knew);
  revalidateFlashcardSurfaces();
}
