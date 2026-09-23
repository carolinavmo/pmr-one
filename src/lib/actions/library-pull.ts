"use server";

import { auth } from "@/auth";
import { searchLibraryPages, getLibraryPullPage, type LibraryPullPage } from "@/lib/library-pull";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";

// Read-only lookups behind My Handbook's "＋ Pull from library" picker
// and "Link to a library page" — still session-gated (My Handbook
// itself is signed-in-only) even though the underlying disease content
// is public, same as every other atlas.ts action's requireUserId().
async function requireSignedIn(): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
}

export async function searchLibraryPagesAction(query: string): Promise<DiseaseCatalogEntry[]> {
  await requireSignedIn();
  return searchLibraryPages(query);
}

export async function getLibraryPullPageAction(slug: string): Promise<LibraryPullPage | null> {
  await requireSignedIn();
  return getLibraryPullPage(slug);
}
