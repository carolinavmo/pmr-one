import { readFileSync } from "fs";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = readFileSync(new URL("../db/migrations/0045_flashcard_category_owner.sql", import.meta.url), "utf-8");
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
await client.query(sql);
await client.end();
console.log("Applied 0045_flashcard_category_owner.sql");
