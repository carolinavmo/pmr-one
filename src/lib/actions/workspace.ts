"use server";

import { auth } from "@/auth";
import { saveNote, toggleSavedPearl, toggleDiseaseFavorite } from "@/lib/workspace";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

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
