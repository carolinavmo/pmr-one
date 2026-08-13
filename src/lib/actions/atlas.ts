"use server";

import { auth } from "@/auth";
import { sanitizeRichText } from "@/lib/rich-text";
import { revalidateAtlasSurfaces } from "@/lib/revalidation";
import type { CardColor } from "@/lib/editorial-blocks";
import {
  createSection,
  renameSection,
  updateSectionColor,
  deleteSection,
  reorderSections,
  createPage,
  renamePage,
  movePage,
  reorderPages,
  updatePageBody,
  deletePage,
  type AtlasSection,
  type AtlasPage,
} from "@/lib/atlas";

// Unlike authoring.ts's requireEditor() (admin/editor-only, for disease
// content), every signed-in member can write their own Atlas — no
// role check, just a session.
async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  return session.user.id;
}

export async function createSectionAction(name: string): Promise<AtlasSection> {
  const userId = await requireUserId();
  const section = await createSection(userId, name.trim() || "Untitled section");
  revalidateAtlasSurfaces();
  return section;
}

export async function renameSectionAction(sectionId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await renameSection(userId, sectionId, name.trim() || "Untitled section");
  revalidateAtlasSurfaces();
}

export async function updateSectionColorAction(sectionId: string, color: CardColor): Promise<void> {
  const userId = await requireUserId();
  await updateSectionColor(userId, sectionId, color);
  revalidateAtlasSurfaces();
}

export async function deleteSectionAction(sectionId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteSection(userId, sectionId);
  revalidateAtlasSurfaces();
}

export async function reorderSectionsAction(orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await reorderSections(userId, orderedIds);
  revalidateAtlasSurfaces();
}

export async function createPageAction(sectionId: string, title: string): Promise<AtlasPage> {
  const userId = await requireUserId();
  const page = await createPage(userId, sectionId, title);
  revalidateAtlasSurfaces();
  return page;
}

export async function renamePageAction(pageId: string, title: string): Promise<void> {
  const userId = await requireUserId();
  await renamePage(userId, pageId, title);
  revalidateAtlasSurfaces();
}

export async function movePageAction(pageId: string, sectionId: string): Promise<void> {
  const userId = await requireUserId();
  await movePage(userId, pageId, sectionId);
  revalidateAtlasSurfaces();
}

export async function reorderPagesAction(sectionId: string, orderedIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await reorderPages(userId, sectionId, orderedIds);
  revalidateAtlasSurfaces();
}

// Mirrors updateBlockRichTextAction in authoring.ts — sanitize before
// persisting, same as every other rich-text-writing action in this app.
export async function savePageBodyAction(pageId: string, html: string): Promise<void> {
  const userId = await requireUserId();
  await updatePageBody(userId, pageId, sanitizeRichText(html));
  revalidateAtlasSurfaces();
}

export async function deletePageAction(pageId: string): Promise<void> {
  const userId = await requireUserId();
  await deletePage(userId, pageId);
  revalidateAtlasSurfaces();
}
