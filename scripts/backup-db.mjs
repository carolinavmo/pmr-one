import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });

const execFileAsync = promisify(execFile);

// Google Drive-synced folder ("G:\O meu disco" = "My Drive") — writing here
// gives every backup an automatic offsite copy with no extra step.
const BACKUP_DIR = "G:\\O meu disco\\PM&R One\\db-backups";
const KEEP_LAST = 30;

function findPgDump() {
  const candidates = [
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
  ];
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  throw new Error(
    "pg_dump.exe not found under C:\\Program Files\\PostgreSQL\\*\\bin. " +
      "Set PG_DUMP_PATH env var to its location if installed elsewhere."
  );
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function pruneOldBackups() {
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("pmr_atlas_") && f.endsWith(".dump"))
    .map((f) => ({ name: f, path: join(BACKUP_DIR, f), mtime: statSync(join(BACKUP_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  const stale = files.slice(KEEP_LAST);
  for (const f of stale) {
    unlinkSync(f.path);
    console.log(`Pruned old backup: ${f.name}`);
  }
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL not set (check .env.local)");

  mkdirSync(BACKUP_DIR, { recursive: true });

  const pgDump = process.env.PG_DUMP_PATH || findPgDump();
  const outFile = join(BACKUP_DIR, `pmr_atlas_${timestamp()}.dump`);

  console.log(`Dumping ${databaseUrl.replace(/:[^:@]+@/, ":***@")} -> ${outFile}`);
  // -Fc: custom format, compressed, restoreable with pg_restore (incl. selective
  // table restore) — not a plain .sql file, which is why the extension is .dump.
  await execFileAsync(pgDump, [databaseUrl, "-Fc", "-f", outFile]);

  const { size } = statSync(outFile);
  console.log(`Backup complete: ${(size / 1024 / 1024).toFixed(2)} MB`);

  pruneOldBackups();
}

main().catch((err) => {
  console.error("Backup failed:", err.message);
  process.exit(1);
});
