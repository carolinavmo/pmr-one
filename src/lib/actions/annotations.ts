"use server";

import { auth } from "@/auth";
import {
  createAnnotation,
  updateAnnotationBody,
  updateAnnotationColor,
  deleteAnnotation,
  type Annotation,
  type AnnotationInput,
} from "@/lib/annotations";
import type { CardColor } from "@/lib/editorial-blocks";

// Rigorous convention (matches study-planner.ts/topics.ts), not
// workspace.ts's older FormData/silent-return style — this feature
// needs real create/update/delete feedback for its inline popover and
// the Workspace drawer's management list.
type ActionResult = { ok: true; annotation?: Annotation } | { ok: false; error: string };

async function requireSession() {
  const session = await auth();
  if (!session) throw new Error("Forbidden");
  return session;
}

// Deliberately no revalidatePath() anywhere in this file. Annotations
// are private per-viewer data, fetched once server-side at page load
// (getAnnotationsForDisease in the disease page route) and mutated
// only in AnnotationProvider's local client state after that — no
// other viewer's page depends on this data, and nothing else
// server-rendered reads it, so busting the shared
// /[locale]/conditions/[slug] route cache here would be pure waste.
// Don't "fix" this by copying authoring.ts's revalidateDiseaseSurfaces
// pattern — it doesn't apply to this feature.

export async function createAnnotationAction(
  diseaseId: string,
  input: AnnotationInput,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!input.quoteExact.trim()) return { ok: false, error: "Nothing was selected." };
  if (!input.body.trim()) return { ok: false, error: "Note can't be empty." };

  const annotation = await createAnnotation(session.user.id, diseaseId, input);
  return { ok: true, annotation };
}

export async function updateAnnotationAction(
  annotationId: string,
  body: string,
): Promise<ActionResult> {
  const session = await requireSession();
  if (!body.trim()) return { ok: false, error: "Note can't be empty." };

  const updated = await updateAnnotationBody(session.user.id, annotationId, body);
  if (!updated) return { ok: false, error: "Note not found." };
  return { ok: true };
}

export async function updateAnnotationColorAction(
  annotationId: string,
  color: CardColor,
): Promise<ActionResult> {
  const session = await requireSession();
  const updated = await updateAnnotationColor(session.user.id, annotationId, color);
  if (!updated) return { ok: false, error: "Note not found." };
  return { ok: true };
}

export async function deleteAnnotationAction(annotationId: string): Promise<ActionResult> {
  const session = await requireSession();
  const deleted = await deleteAnnotation(session.user.id, annotationId);
  if (!deleted) return { ok: false, error: "Note not found." };
  return { ok: true };
}
