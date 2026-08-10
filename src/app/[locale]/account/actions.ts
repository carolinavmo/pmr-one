"use server";

import bcrypt from "bcryptjs";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/auth";
import { pool } from "@/lib/db";

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
