"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
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
  togglePagePinned,
  updatePageBody,
  updatePageTags,
  setPageLinkedDisease,
  getLinkedDiseaseSummary,
  getBacklinksForPage,
  duplicatePageAsTemplate,
  deletePage,
  type AtlasSection,
  type AtlasPage,
  type LinkedDiseaseSummary,
  type AtlasBacklink,
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

export async function createPageAction(
  sectionId: string,
  title: string,
  templatePageId?: string
): Promise<AtlasPage> {
  const userId = await requireUserId();
  const page = await createPage(userId, sectionId, title, templatePageId);
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

export async function togglePagePinnedAction(pageId: string): Promise<boolean> {
  const userId = await requireUserId();
  const isPinned = await togglePagePinned(userId, pageId);
  revalidateAtlasSurfaces();
  return isPinned;
}

// Mirrors updateBlockRichTextAction in authoring.ts — sanitize before
// persisting, same as every other rich-text-writing action in this app.
export async function savePageBodyAction(pageId: string, html: string): Promise<void> {
  const userId = await requireUserId();
  await updatePageBody(userId, pageId, sanitizeRichText(html));
  revalidateAtlasSurfaces();
}

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Mirrors authoring.ts's saveUploadedIllustration almost verbatim (same
// disk-under-public/ storage, same 8MB cap, same randomUUID()+ext
// filename) — a separate uploads/atlas/ subtree and a plain signed-in
// check instead of requireEditor(), since a Handbook image is the
// member's own, not editorial content. Serving is free: the existing
// /api/uploads/[...path] catch-all already covers anything under
// public/uploads/**.
export async function uploadPageImageAction(formData: FormData): Promise<string> {
  await requireUserId();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image is too large (8MB max).");

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "atlas");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  } catch (err) {
    console.error(`uploadPageImageAction: failed writing to ${dir}`, err);
    throw new Error("Could not save the uploaded image.");
  }
  return `/api/uploads/atlas/${filename}`;
}

export async function deletePageAction(pageId: string): Promise<void> {
  const userId = await requireUserId();
  await deletePage(userId, pageId);
  revalidateAtlasSurfaces();
}

export async function updatePageTagsAction(pageId: string, tags: string[]): Promise<void> {
  const userId = await requireUserId();
  await updatePageTags(userId, pageId, tags);
  revalidateAtlasSurfaces();
}

export async function setPageLinkedDiseaseAction(pageId: string, diseaseId: string | null): Promise<void> {
  const userId = await requireUserId();
  await setPageLinkedDisease(userId, pageId, diseaseId);
  revalidateAtlasSurfaces();
}

// Read-only — no revalidate. Called from a client effect when the
// selected page's linkedDiseaseId changes (AtlasContextRail.tsx), not
// from a mutation.
export async function getLinkedDiseaseSummaryAction(diseaseId: string): Promise<LinkedDiseaseSummary | null> {
  await requireUserId();
  return getLinkedDiseaseSummary(diseaseId);
}

export async function getBacklinksForPageAction(pageId: string): Promise<AtlasBacklink[]> {
  const userId = await requireUserId();
  return getBacklinksForPage(userId, pageId);
}

export async function saveAsTemplateAction(
  pageId: string,
  templatesSectionName: string,
  newTitle: string
): Promise<AtlasPage> {
  const userId = await requireUserId();
  const page = await duplicatePageAsTemplate(userId, pageId, templatesSectionName, newTitle);
  revalidateAtlasSurfaces();
  return page;
}
