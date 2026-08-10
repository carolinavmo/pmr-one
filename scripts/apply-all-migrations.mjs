import { readFileSync, readdirSync } from "fs";
import { join } from "path";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const migrationsDir = join(import.meta.dirname, "..", "db", "migrations");
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), "utf-8");
  process.stdout.write(`Applying ${file}... `);
  await client.query(sql);
  console.log("ok");
}

await client.end();
console.log(`Applied ${files.length} migrations.`);
