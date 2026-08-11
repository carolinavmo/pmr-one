"use server";

import bcrypt from "bcryptjs";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { revalidatePath } from "next/cache";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

// Own subdirectory, same "local disk under public/, not cloud object
// storage" call as every other upload in this codebase (dashboard
// hero background, disease illustrations, simple_image blocks).
async function saveUploadedAvatar(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files can be uploaded.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image is too large (4MB max).");
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".png";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "avatars");
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), bytes);
  } catch (err) {
    console.error(`saveUploadedAvatar: failed writing to ${dir}`, err);
    throw new Error("Could not save the uploaded image.");
  }
  // Served via the dynamic route (src/app/api/uploads/[...path]/route.ts's
  // own comment explains why a plain /uploads/... static path doesn't
  // reliably work for a file written after the server started).
  return `/api/uploads/avatars/${filename}`;
}

// Best-effort cleanup of the file an avatar is replacing/removing —
// never blocks the save if it's already gone, or was never a local
// upload (an OAuth provider's own photo URL, say, if one's added
// later) — same defensive pattern dashboard-hero.ts's own upload
// action already uses. Accepts both the current /api/uploads/avatars/
// form and the legacy /uploads/avatars/ form still on existing rows.
async function deleteLocalAvatarIfAny(imageUrl: string | null) {
  if (!imageUrl) return;
  const relative = imageUrl.startsWith("/api/uploads/avatars/")
    ? imageUrl.slice("/api".length)
    : imageUrl.startsWith("/uploads/avatars/")
      ? imageUrl
      : null;
  if (!relative) return;
  const filePath = path.join(process.cwd(), "public", relative);
  await unlink(filePath).catch(() => {});
}

export async function updateAvatarAction(formData: FormData) {
  const session = await auth();
  if (!session) throw new Error("Forbidden");

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");

  const assetUrl = await saveUploadedAvatar(file);

  const { rows } = await pool.query(`SELECT image FROM users WHERE id = $1`, [session.user.id]);
  const previous = rows[0]?.image as string | null;

  await pool.query(`UPDATE users SET image = $1, updated_at = now() WHERE id = $2`, [
    assetUrl,
    session.user.id,
  ]);
  await deleteLocalAvatarIfAny(previous);

  revalidatePath("/", "layout");
}

export async function removeAvatarAction() {
  const session = await auth();
  if (!session) throw new Error("Forbidden");

  const { rows } = await pool.query(`SELECT image FROM users WHERE id = $1`, [session.user.id]);
  const previous = rows[0]?.image as string | null;

  await pool.query(`UPDATE users SET image = NULL, updated_at = now() WHERE id = $1`, [
    session.user.id,
  ]);
  await deleteLocalAvatarIfAny(previous);

  revalidatePath("/", "layout");
}

export async function updateNameAction(formData: FormData) {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    redirect({ href: "/login", locale });
    return;
  }

  const name = (formData.get("name") as string)?.trim();
  if (!name) {
    redirect({ href: "/account?nameError=1", locale });
    return;
  }

  await pool.query(`UPDATE users SET name = $1, updated_at = now() WHERE id = $2`, [
    name,
    session.user.id,
  ]);
  revalidatePath("/", "layout");
  redirect({ href: "/account?nameSuccess=1", locale });
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  const locale = await getLocale();
  if (!session) {
    // See the matching comment in account/page.tsx — the extra
    // `return` works around a TS narrowing gap with destructured
    // `never`-returning functions.
    redirect({ href: "/login", locale });
    return;
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;

  const { rows } = await pool.query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [session.user.id]
  );
  const passwordHash = rows[0]?.password_hash as string | undefined;

  if (!passwordHash || !(await bcrypt.compare(currentPassword, passwordHash))) {
    redirect({ href: "/account?error=1", locale });
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query(
    `UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2`,
    [newHash, session.user.id]
  );

  redirect({ href: "/account?success=1", locale });
}
