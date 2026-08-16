import { readFileSync } from "fs";
import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const sql = readFileSync(new URL("../db/migrations/0048_folder_sample_access.sql", import.meta.url), "utf-8");
const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
await client.query(sql);
await client.end();
console.log("Applied 0048_folder_sample_access.sql");
