import { mkdir, readdir, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { pool } from "@/lib/db";

// Used by deleteDiseaseAction (admin/actions.ts) as the pre-delete
// safety net. The original mechanism shelled out to
// scripts/backup-db.mjs, which only ever worked on the founder's own
// Windows machine — a hardcoded `G:\...` Google-Drive path and a
// pg_dump.exe lookup under `C:\Program Files\PostgreSQL\*`. On
// Railway's Linux container neither exists, so that backup step
// failed on every single attempt in production, silently blocking
// every disease deletion ("Backup failed, delete aborted") — this is
// what stopped the Ankle Anatomy delete. This version needs nothing
// beyond the `pg` package already in use everywhere else: it dumps
// every table's rows as JSON directly through the same pool, and
// writes into the app's own persistent uploads volume (already
// confirmed writable on Railway), so it works identically in dev and
// production. scripts/backup-db.mjs is untouched — it's still a fine
// manual "back up to my Google Drive" tool on the founder's own
// machine, just no longer the thing this in-app safety net relies on.
const BACKUP_DIR = path.join(process.cwd(), "public", "uploads", "db-backups");
const KEEP_LAST = 30;

function timestamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

async function pruneOldBackups() {
  const files = await readdir(BACKUP_DIR);
  const backups = await Promise.all(
    files
      .filter((f) => f.startsWith("pmr_atlas_") && f.endsWith(".json"))
      .map(async (f) => {
        const filePath = path.join(BACKUP_DIR, f);
        const { mtimeMs } = await stat(filePath);
        return { name: f, path: filePath, mtimeMs };
      })
  );
  backups.sort((a, b) => b.mtimeMs - a.mtimeMs);
  for (const stale of backups.slice(KEEP_LAST)) {
    await unlink(stale.path);
  }
}

// Dumps every base table in the public schema as JSON — table-name-
// agnostic (reads the table list from the catalog itself) so a new
// migration's table is backed up automatically, with no line to
// remember to add here the way DISEASE_RELATIONSHIP_TABLES needs one.
export async function createDatabaseBackup(): Promise<{ filePath: string; sizeBytes: number }> {
  await mkdir(BACKUP_DIR, { recursive: true });

  const { rows: tableRows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  const dump: Record<string, unknown[]> = {};
  for (const { tablename } of tableRows) {
    const { rows } = await pool.query(`SELECT * FROM "${tablename}"`);
    dump[tablename] = rows;
  }

  const filePath = path.join(BACKUP_DIR, `pmr_atlas_${timestamp()}.json`);
  const contents = JSON.stringify(dump);
  await writeFile(filePath, contents);

  await pruneOldBackups();

  return { filePath, sizeBytes: Buffer.byteLength(contents) };
}
