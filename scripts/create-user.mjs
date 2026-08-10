// Bootstraps a user directly against the database — the same
// "structured seed script, not a visual editor" pattern used for
// content authoring (IMPLEMENTATION_PLAN.md), applied to accounts
// since there's no signup UI yet (deliberately deferred to Phase 2).
//
// Usage: node scripts/create-user.mjs <email> <password> [role]
import { Pool } from "pg";
import { config } from "dotenv";
import bcrypt from "bcryptjs";

config({ path: ".env.local" });

const [, , email, password, role = "member"] = process.argv;

if (!email || !password) {
  console.error("Usage: node scripts/create-user.mjs <email> <password> [role]");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const passwordHash = await bcrypt.hash(password, 10);

const { rows } = await pool.query(
  `INSERT INTO users (email, role, password_hash)
   VALUES ($1, $2, $3)
   ON CONFLICT (email) DO UPDATE SET role = $2, password_hash = $3
   RETURNING id, email, role`,
  [email, role, passwordHash]
);

console.log("User ready:", rows[0]);
await pool.end();
