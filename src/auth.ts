import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import PostgresAdapter from "@auth/pg-adapter";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PostgresAdapter(pool),
  // Credentials provider requires JWT sessions — it has no persistent
  // account row for the adapter's database-session strategy to attach to.
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { rows } = await pool.query(
          `SELECT id, name, email, image, role, password_hash FROM users WHERE email = $1`,
          [email]
        );
        const user = rows[0];
        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        // Explicit rather than relying on NextAuth's implicit
        // user->token merge, matching how role/id are handled here —
        // one clear place this session ever touches the DB's `image`
        // column, not an assumption about default provider behavior.
        token.picture = user.image;
      } else if (token.sub) {
        // A JWT session only re-populates `user` at sign-in — without
        // this branch, an avatar or display-name change saved from
        // /account (or a role change from /admin) would sit invisible
        // everywhere else in the app until the user signed out and
        // back in. Every other page load already does its own
        // uncached DB reads (getDiseaseBySlug, etc.), so one more
        // small indexed lookup here keeps that same posture.
        const { rows } = await pool.query(
          `SELECT name, image, role FROM users WHERE id = $1`,
          [token.sub]
        );
        if (rows[0]) {
          token.name = rows[0].name;
          token.picture = rows[0].image;
          token.role = rows[0].role;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub as string;
      session.user.role = token.role ?? "member";
      session.user.image = token.picture ?? null;
      return session;
    },
  },
});
