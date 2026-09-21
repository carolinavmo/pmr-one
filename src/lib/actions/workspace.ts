"use server";

import { auth } from "@/auth";
import {
  saveNote,
  toggleSavedPearl,
  toggleDiseaseFavorite,
  toggleCalculatorFavorite,
  saveReadingProgress,
  type ReadingProgress,
} from "@/lib/workspace";
import { revalidateDiseaseSurfaces, revalidateClinicalToolsSurfaces } from "@/lib/revalidation";

export async function saveNoteAction(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const diseaseId = formData.get("diseaseId") as string;
  const body = formData.get("body") as string;

  await saveNote(session.user.id, diseaseId, body);
  revalidateDiseaseSurfaces();
}

export async function toggleSavedPearlAction(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const pearlId = formData.get("pearlId") as string;

  await toggleSavedPearl(session.user.id, pearlId);
  revalidateDiseaseSurfaces();
}

export async function toggleDiseaseFavoriteAction(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const diseaseId = formData.get("diseaseId") as string;

  await toggleDiseaseFavorite(session.user.id, diseaseId);
  revalidateDiseaseSurfaces();
}

export async function toggleCalculatorFavoriteAction(formData: FormData) {
  const session = await auth();
  if (!session) return;

  const calculatorId = formData.get("calculatorId") as string;

  await toggleCalculatorFavorite(session.user.id, calculatorId);
  revalidateClinicalToolsSurfaces();
}

// Plain-argument Server Action rather than the FormData shape every
// other action here uses — this one is invoked directly from a
// debounced client-side effect (IndexSidebar.tsx's reading-progress
// autosave), never from a <form>, so there's no FormData to read in
// the first place. No revalidateDiseaseSurfaces() call: nothing
// server-rendered reads this back, only the client's own next fetch of
// /api/reading-progress/[slug].
export async function saveReadingProgressAction(diseaseId: string, progress: ReadingProgress) {
  const session = await auth();
  if (!session) return;

  await saveReadingProgress(session.user.id, diseaseId, progress);
}
