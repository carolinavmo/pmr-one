"use server";

import { auth } from "@/auth";
import { revalidateFlashcardAdminSurfaces } from "@/lib/revalidation";
import {
  createAdminDeck,
  updateAdminDeckMeta,
  publishAdminDeck,
  unpublishAdminDeck,
  archiveAdminDeck,
  unarchiveAdminDeck,
  duplicateAdminDeck,
  reorderAdminDecks,
  createAdminCard,
  updateAdminCard,
  flagCardAnswerChanged,
  publishAdminCard,
  unpublishAdminCard,
  softDeleteAdminCard,
  duplicateAdminCard,
  reorderAdminCards,
  getCardBlastRadius,
  bulkImportCards,
  generateCardsFromDisease,
  getCardHealthReport,
} from "@/lib/flashcards-admin";
import { parseCardImport } from "@/lib/csv-parse";
import { getPublishedDiseases, type DiseaseCatalogEntry } from "@/lib/disease-catalog";

// Same shape as admin/actions.ts's own requireReviewer() — editor or
// admin only. Redefined locally rather than shared/exported: every
// actions file in this app keeps its own copy (see admin/actions.ts,
// diseases.ts), not an established-but-unwritten convention this
// file should be the first to break.
async function requireReviewer() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") throw new Error("Forbidden");
  return session;
}

export async function createAdminDeckAction(name: string, categoryId: string | null): Promise<string> {
  await requireReviewer();
  const id = await createAdminDeck(name, categoryId);
  revalidateFlashcardAdminSurfaces();
  return id;
}

export async function updateAdminDeckMetaAction(
  deckId: string,
  fields: { name: string; description: string; categoryId: string | null }
): Promise<void> {
  await requireReviewer();
  await updateAdminDeckMeta(deckId, fields);
  revalidateFlashcardAdminSurfaces();
}

export async function publishAdminDeckAction(deckId: string): Promise<{ ok: boolean; reason?: "no-published-cards" }> {
  const session = await requireReviewer();
  const result = await publishAdminDeck(deckId, session.user.id);
  revalidateFlashcardAdminSurfaces();
  return result;
}

export async function unpublishAdminDeckAction(deckId: string): Promise<void> {
  await requireReviewer();
  await unpublishAdminDeck(deckId);
  revalidateFlashcardAdminSurfaces();
}

export async function archiveAdminDeckAction(deckId: string): Promise<void> {
  await requireReviewer();
  await archiveAdminDeck(deckId);
  revalidateFlashcardAdminSurfaces();
}

export async function unarchiveAdminDeckAction(deckId: string): Promise<void> {
  await requireReviewer();
  await unarchiveAdminDeck(deckId);
  revalidateFlashcardAdminSurfaces();
}

export async function duplicateAdminDeckAction(deckId: string): Promise<string | null> {
  await requireReviewer();
  const id = await duplicateAdminDeck(deckId);
  revalidateFlashcardAdminSurfaces();
  return id;
}

export async function reorderAdminDecksAction(categoryId: string | null, orderedIds: string[]): Promise<void> {
  await requireReviewer();
  await reorderAdminDecks(categoryId, orderedIds);
  revalidateFlashcardAdminSurfaces();
}

export async function createAdminCardAction(deckId: string, question: string, answer: string): Promise<string | null> {
  await requireReviewer();
  const id = await createAdminCard(deckId, question, answer);
  revalidateFlashcardAdminSurfaces();
  return id;
}

export async function updateAdminCardAction(cardId: string, fields: { question: string; answer: string }): Promise<void> {
  await requireReviewer();
  await updateAdminCard(cardId, fields);
  revalidateFlashcardAdminSurfaces();
}

export async function flagCardAnswerChangedAction(cardId: string): Promise<{ resetCount: number }> {
  await requireReviewer();
  const result = await flagCardAnswerChanged(cardId);
  revalidateFlashcardAdminSurfaces();
  return result;
}

export async function publishAdminCardAction(cardId: string): Promise<void> {
  await requireReviewer();
  await publishAdminCard(cardId);
  revalidateFlashcardAdminSurfaces();
}

export async function unpublishAdminCardAction(cardId: string): Promise<void> {
  await requireReviewer();
  await unpublishAdminCard(cardId);
  revalidateFlashcardAdminSurfaces();
}

export async function softDeleteAdminCardAction(cardId: string): Promise<void> {
  await requireReviewer();
  await softDeleteAdminCard(cardId);
  revalidateFlashcardAdminSurfaces();
}

export async function duplicateAdminCardAction(cardId: string): Promise<string | null> {
  await requireReviewer();
  const id = await duplicateAdminCard(cardId);
  revalidateFlashcardAdminSurfaces();
  return id;
}

export async function reorderAdminCardsAction(deckId: string, orderedIds: string[]): Promise<void> {
  await requireReviewer();
  await reorderAdminCards(deckId, orderedIds);
  revalidateFlashcardAdminSurfaces();
}

export async function getCardBlastRadiusAction(cardId: string): Promise<number> {
  await requireReviewer();
  return getCardBlastRadius(cardId);
}

// ---------- Pass 7 ----------

export interface ImportPreviewRow {
  question: string;
  answer: string;
  tags: string;
}

// Parsing is its own step from importing (the "dry run" the spec
// asks for) — this never touches the database, just returns what a
// paste would create so the editor can look before committing.
export async function previewCardImportAction(rawText: string): Promise<ImportPreviewRow[]> {
  await requireReviewer();
  return parseCardImport(rawText);
}

export async function bulkImportCardsAction(deckId: string, rows: { question: string; answer: string }[]): Promise<number> {
  await requireReviewer();
  const created = await bulkImportCards(deckId, rows);
  revalidateFlashcardAdminSurfaces();
  return created;
}

export async function getPublishedDiseasesForPickerAction(): Promise<DiseaseCatalogEntry[]> {
  await requireReviewer();
  return getPublishedDiseases();
}

export async function generateCardsFromDiseaseAction(
  deckId: string,
  diseaseId: string,
  count: number
): Promise<{ created: number; diseaseName: string | null; error?: string }> {
  await requireReviewer();
  try {
    const result = await generateCardsFromDisease(deckId, diseaseId, count);
    revalidateFlashcardAdminSurfaces();
    return result;
  } catch (err) {
    return { created: 0, diseaseName: null, error: err instanceof Error ? err.message : "Generation failed." };
  }
}

export async function getCardHealthReportAction() {
  await requireReviewer();
  return getCardHealthReport();
}
