import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const { rows } = await pool.query(
  "SELECT count(*)::int AS table_count FROM information_schema.tables WHERE table_schema = 'public'"
);
console.log(`Connected. Public schema has ${rows[0].table_count} tables.`);
await pool.end();
