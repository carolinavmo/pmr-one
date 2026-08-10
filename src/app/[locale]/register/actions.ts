"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { signIn } from "@/auth";
import { pool } from "@/lib/db";

export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string | null)?.trim() || null;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = await getLocale();

  const { rows: existing } = await pool.query(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (existing.length > 0) {
    redirect({ href: "/register?error=email_taken", locale });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  // role intentionally not accepted from the form — every self-
  // registered account is 'member' (the users.role default);
  // editor/admin accounts are still bootstrapped only via
  // scripts/create-user.mjs.
  await pool.query(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)`,
    [name, email, passwordHash]
  );

  try {
    // signIn's own redirectTo stays a plain (locale-agnostic) path —
    // next-auth calls next/navigation's redirect() internally, with no
    // next-intl awareness, so a locale-prefixed target here would just
    // get appended wrong. "/" without a prefix still 307s through the
    // proxy into the correct locale-prefixed homepage.
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect({ href: "/login?error=1", locale });
    }
    throw error;
  }
}
