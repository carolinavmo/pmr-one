"use server";

import { auth } from "@/auth";
import { saveNote, toggleSavedPearl, toggleDiseaseFavorite, toggleCalculatorFavorite } from "@/lib/workspace";
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
