"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidateShellSurfaces, revalidateDiseaseSurfaces } from "@/lib/revalidation";

async function requireReviewer() {
  const session = await auth();
  if (session?.user.role !== "editor" && session?.user.role !== "admin") {
    throw new Error("Forbidden");
  }
  return session;
}

export async function publishDisease(formData: FormData) {
  const session = await requireReviewer();
  const id = formData.get("diseaseId");

  await pool.query(
    `UPDATE disease
     SET status = 'published', published_at = now(),
         reviewed_by = $2, reviewed_at = now(), updated_at = now()
     WHERE id = $1`,
    [id, session.user.id]
  );

  revalidateShellSurfaces();
  revalidateDiseaseSurfaces();
}

export async function unpublishDisease(formData: FormData) {
  await requireReviewer();
  const id = formData.get("diseaseId");

  await pool.query(
    `UPDATE disease
     SET status = 'draft', published_at = NULL, updated_at = now()
     WHERE id = $1`,
    [id]
  );

  revalidateShellSurfaces();
  revalidateDiseaseSurfaces();
}
