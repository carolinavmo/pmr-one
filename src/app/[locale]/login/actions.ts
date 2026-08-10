"use server";

import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { signIn } from "@/auth";
import { pool } from "@/lib/db";

export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password");
  const locale = await getLocale();

  try {
    // No redirectTo here on purpose — signIn() would redirect
    // internally before this function could read the resulting
    // session, and a member landing on /admin would immediately
    // bounce back to /login (admin/page.tsx's own role guard),
    // a real loop now that self-registered members exist.
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect({ href: "/login?error=1", locale });
    }
    throw error;
  }

  // Not auth() here — the session cookie signIn() just set only takes
  // effect on the *next* request; reading it back within this same
  // Server Action invocation sees the stale, signed-out incoming
  // request and would always redirect as if canReview were false
  // (caught in browser verification — this was the actual bug).
  // Querying role directly by email is reliable regardless of cookie
  // timing.
  const { rows } = await pool.query(`SELECT role FROM users WHERE email = $1`, [email]);
  const canReview = rows[0]?.role === "editor" || rows[0]?.role === "admin";
  redirect({ href: canReview ? "/admin" : "/", locale });
}
