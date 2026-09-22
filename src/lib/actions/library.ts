"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { isLibrarySort, type LibrarySort } from "@/lib/library-sort";

// "Remembers the last tab, region, sort and hide read" per user
// (design/LIBRARY-HOME-MIX-SPEC.md, Pass 4) — one row per user,
// upserted from the client whenever any of the four changes. Signed
// out has nothing to remember (there's no account), so this is a
// silent no-op rather than an error when there's no session.
export async function saveLibraryPrefsAction(prefs: {
  area: string | null;
  region: string | null;
  sort: LibrarySort;
  hideRead: boolean;
}) {
  const session = await auth();
  if (!session) return;

  await pool.query(
    `INSERT INTO library_home_prefs (user_id, area, region_slug, sort, hide_read, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       area = $2, region_slug = $3, sort = $4, hide_read = $5, updated_at = now()`,
    [session.user.id, prefs.area, prefs.region, prefs.sort, prefs.hideRead]
  );
}

export interface LibraryPrefs {
  area: string | null;
  region: string | null;
  sort: LibrarySort;
  hideRead: boolean;
}

export async function getLibraryPrefs(userId: string): Promise<LibraryPrefs | null> {
  const { rows } = await pool.query<{
    area: string | null;
    region_slug: string | null;
    sort: string;
    hide_read: boolean;
  }>(`SELECT area, region_slug, sort, hide_read FROM library_home_prefs WHERE user_id = $1`, [userId]);
  const row = rows[0];
  if (!row) return null;
  return {
    area: row.area,
    region: row.region_slug,
    sort: isLibrarySort(row.sort) ? row.sort : "reading_order",
    hideRead: row.hide_read,
  };
}
