"use server";

import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { requireEditor } from "@/lib/actions/authoring";
import type { DashboardHeroCard } from "@/lib/dashboard-hero";
import { revalidateShellSurfaces } from "@/lib/revalidation";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

// Same "local disk under public/, not cloud object storage" call as
// authoring.ts's saveUploadedIllustration — a separate function (own
// subdirectory) rather than reusing that one directly, since a hero
// background isn't a medical_illustration row (no title/alt text/
// sharing across diseases to track), just a flat file + URL.
async function saveUploadedHeroBackground(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large (8MB max).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "hero");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  } catch (err) {
    console.error(`saveUploadedHeroBackground: failed writing to ${dir}`, err);
    throw new Error("Could not save the uploaded image.");
  }
  return `/uploads/hero/${filename}`;
}

export async function updateDashboardHeroTextAction(
  field: "headline" | "subtitle",
  value: string,
) {
  await requireEditor();
  await pool.query(
    `UPDATE dashboard_hero SET ${field} = $1, updated_at = now() WHERE id = 1`,
    [value],
  );
  revalidateShellSurfaces();
}

export async function updateDashboardHeroScrimAction(enabled: boolean) {
  await requireEditor();
  await pool.query(
    `UPDATE dashboard_hero SET background_scrim = $1, updated_at = now() WHERE id = 1`,
    [enabled],
  );
  revalidateShellSurfaces();
}

export async function updateDashboardHeroCardsAction(
  cards: DashboardHeroCard[],
) {
  await requireEditor();
  await pool.query(
    `UPDATE dashboard_hero SET cards = $1::jsonb, updated_at = now() WHERE id = 1`,
    [JSON.stringify(cards)],
  );
  revalidateShellSurfaces();
}

export async function uploadDashboardHeroBackgroundAction(formData: FormData) {
  await requireEditor();
  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");

  const assetUrl = await saveUploadedHeroBackground(file);
  const { rows } = await pool.query(
    `SELECT background_image_url FROM dashboard_hero WHERE id = 1`,
  );
  const previous = rows[0]?.background_image_url as string | null;

  await pool.query(
    `UPDATE dashboard_hero SET background_image_url = $1, updated_at = now() WHERE id = 1`,
    [assetUrl],
  );

  // Best-effort cleanup of the file it's replacing — never blocks the
  // save if it's already gone or was never a local upload (a stale
  // path from some future non-local storage swap, say).
  if (previous) {
    const previousPath = path.join(process.cwd(), "public", previous);
    await unlink(previousPath).catch(() => {});
  }
  revalidateShellSurfaces();
}

export async function removeDashboardHeroBackgroundAction() {
  await requireEditor();
  const { rows } = await pool.query(
    `SELECT background_image_url FROM dashboard_hero WHERE id = 1`,
  );
  const previous = rows[0]?.background_image_url as string | null;

  await pool.query(
    `UPDATE dashboard_hero SET background_image_url = NULL, updated_at = now() WHERE id = 1`,
  );

  if (previous) {
    const previousPath = path.join(process.cwd(), "public", previous);
    await unlink(previousPath).catch(() => {});
  }
  revalidateShellSurfaces();
}
