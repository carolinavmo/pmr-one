import pg from "pg";
import { config } from "dotenv";
config({ path: ".env.local" });
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const ids = [
  "956a8bd4-8b54-4c95-b944-06124b5b1d1e", // paragraph 71
  "b9e7aea2-cbc1-4bfb-bb99-721fcb526377", // icon_list 72
  "ca9296ba-dba2-47c7-8a59-92607596773d", // icon_list 73
  "522633be-3143-4dd5-bec0-1646663d8616", // comparison_table 81
  "3644f118-4d2b-4988-9813-ff6bc695b028", // clinical_pearl 91
];
const { rows } = await pool.query(
  `SELECT id, block_type, content_config FROM editorial_block WHERE id = ANY($1::uuid[])`,
  [ids]
);
for (const r of rows) console.log(r.id, r.block_type, JSON.stringify(r.content_config).slice(0, 200));
await pool.end();
