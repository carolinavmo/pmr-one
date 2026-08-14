"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { auth } from "@/auth";
import { revalidateFlashcardSurfaces } from "@/lib/revalidation";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  createDeck,
  renameDeck,
  updateDeckColor,
  updateDeckIcon,
  deleteDeck,
  reorderDecks,
  createCard,
  updateCard,
  deleteCard,
  reorderCards,
  recordReview,
  toggleDeckFavorite,
  type DeckSummary,
  type FlashcardCard,
} from "@/lib/flashcards";

// Every signed-in member can create/edit their own decks — no role
// check on creation, same shape as atlas.ts's requireUserId. Editing
// an *existing* deck is different: a preset (system) deck is
// admin-authored content, so those actions also need `isEditor` to
// widen the ownership check in the data layer (flashcards.ts) — same
// role check as authoring.ts's requireEditor(), rolled locally here
// rather than imported, matching how topics.ts and admin/actions.ts
// each define their own rather than sharing one.
async function requireUserId(): Promise<{ userId: string; isEditor: boolean }> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  const isEditor = session.user.role === "editor" || session.user.role === "admin";
  return { userId: session.user.id, isEditor };
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

async function saveUploadedDeckIcon(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large (8MB max).");
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "flashcard-decks");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  } catch (err) {
    console.error(`saveUploadedDeckIcon: failed writing to ${dir}`, err);
    throw new Error("Could not save the uploaded image.");
  }
  return `/api/uploads/flashcard-decks/${filename}`;
}

export async function createDeckAction(name: string, color: CardColor): Promise<DeckSummary> {
  const { userId } = await requireUserId();
  const deck = await createDeck(userId, name.trim() || "Untitled deck", color);
  revalidateFlashcardSurfaces();
  return deck;
}

export async function renameDeckAction(deckId: string, name: string): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await renameDeck(userId, deckId, name.trim() || "Untitled deck", isEditor);
  revalidateFlashcardSurfaces();
}

export async function updateDeckColorAction(deckId: string, color: CardColor): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await updateDeckColor(userId, deckId, color, isEditor);
  revalidateFlashcardSurfaces();
}

// Returns the real uploaded URL (not a client-side blob: URL) so the
// caller can hold it in state immediately — same reasoning
// uploadMediaTabsImageAction in authoring.ts documents for its own
// callers.
export async function uploadDeckIconAction(deckId: string, formData: FormData): Promise<string> {
  const { userId, isEditor } = await requireUserId();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  const assetUrl = await saveUploadedDeckIcon(file);
  await updateDeckIcon(userId, deckId, assetUrl, isEditor);
  revalidateFlashcardSurfaces();
  return assetUrl;
}

export async function removeDeckIconAction(deckId: string): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await updateDeckIcon(userId, deckId, null, isEditor);
  revalidateFlashcardSurfaces();
}

export async function deleteDeckAction(deckId: string): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await deleteDeck(userId, deckId, isEditor);
  revalidateFlashcardSurfaces();
}

export async function reorderDecksAction(orderedIds: string[]): Promise<void> {
  const { userId } = await requireUserId();
  await reorderDecks(userId, orderedIds);
  revalidateFlashcardSurfaces();
}

export async function createCardAction(
  deckId: string,
  question: string,
  answer: string
): Promise<FlashcardCard | null> {
  const { userId, isEditor } = await requireUserId();
  const card = await createCard(userId, deckId, question.trim(), answer.trim(), isEditor);
  revalidateFlashcardSurfaces();
  return card;
}

export async function updateCardAction(cardId: string, question: string, answer: string): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await updateCard(userId, cardId, question.trim(), answer.trim(), isEditor);
  revalidateFlashcardSurfaces();
}

export async function deleteCardAction(cardId: string): Promise<void> {
  const { userId, isEditor } = await requireUserId();
  await deleteCard(userId, cardId, isEditor);
  revalidateFlashcardSurfaces();
}

export async function reorderCardsAction(deckId: string, orderedIds: string[]): Promise<void> {
  const { userId } = await requireUserId();
  await reorderCards(userId, deckId, orderedIds);
  revalidateFlashcardSurfaces();
}

// Fire-and-forget from the client (the reviewer already advances
// optimistically in local state) — same idiom as TaskRow.tsx's
// toggleTaskCompleteAction, no useTransition needed. Revalidates so the
// deck grid's mastery progress bar is correct on the next visit, but
// doesn't block the reviewer UI on it.
export async function recordReviewAction(flashcardId: string, knew: boolean): Promise<void> {
  const { userId } = await requireUserId();
  await recordReview(userId, flashcardId, knew);
  revalidateFlashcardSurfaces();
}

// Fire-and-forget from the client, same idiom as recordReviewAction —
// the star already flips optimistically in local state.
export async function toggleDeckFavoriteAction(deckId: string): Promise<void> {
  const { userId } = await requireUserId();
  await toggleDeckFavorite(userId, deckId);
  revalidateFlashcardSurfaces();
}
