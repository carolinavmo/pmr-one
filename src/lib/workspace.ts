import { pool } from "@/lib/db";

// Personal Workspace v1 — three real capabilities only (Notes, Saved
// Pearls, Recently Viewed). Same pool.query pattern as
// disease-loader.ts/disease-catalog.ts, no ORM.

export async function getNote(
  userId: string,
  diseaseId: string,
): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT body FROM note WHERE user_id = $1 AND disease_id = $2`,
    [userId, diseaseId],
  );
  return rows[0]?.body ?? null;
}

export async function saveNote(
  userId: string,
  diseaseId: string,
  body: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO note (user_id, disease_id, body)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, disease_id) DO UPDATE SET body = $3, updated_at = now()`,
    [userId, diseaseId, body],
  );
}

export async function getSavedPearlIds(userId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT clinical_pearl_id FROM pearl_save WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r) => r.clinical_pearl_id as string));
}

export async function toggleSavedPearl(
  userId: string,
  pearlId: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `DELETE FROM pearl_save WHERE user_id = $1 AND clinical_pearl_id = $2 RETURNING 1`,
    [userId, pearlId],
  );
  if (rows.length > 0) return false;

  await pool.query(
    `INSERT INTO pearl_save (user_id, clinical_pearl_id) VALUES ($1, $2)`,
    [userId, pearlId],
  );
  return true;
}

export interface SavedPearl {
  id: string;
  body: string;
  diseaseSlug: string | null;
  diseaseName: string | null;
}

export async function getSavedPearls(userId: string): Promise<SavedPearl[]> {
  const { rows } = await pool.query(
    `SELECT p.id, p.body, d.slug AS disease_slug, d.canonical_name AS disease_name
     FROM pearl_save ps
     JOIN clinical_pearl_editorial p ON p.id = ps.clinical_pearl_id
     LEFT JOIN pearl_attachment pa ON pa.clinical_pearl_id = p.id AND pa.target_type = 'disease'
     LEFT JOIN disease d ON d.id = pa.target_id
     WHERE ps.user_id = $1
     ORDER BY ps.created_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    diseaseSlug: r.disease_slug ?? null,
    diseaseName: r.disease_name ?? null,
  }));
}

export async function recordPageView(
  userId: string,
  diseaseId: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO page_view (user_id, disease_id, viewed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, disease_id) DO UPDATE SET viewed_at = now()`,
    [userId, diseaseId],
  );
}

export async function isDiseaseFavorited(
  userId: string,
  diseaseId: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM disease_favorite WHERE user_id = $1 AND disease_id = $2`,
    [userId, diseaseId],
  );
  return rows.length > 0;
}

export async function toggleDiseaseFavorite(
  userId: string,
  diseaseId: string,
): Promise<boolean> {
  const { rows } = await pool.query(
    `DELETE FROM disease_favorite WHERE user_id = $1 AND disease_id = $2 RETURNING 1`,
    [userId, diseaseId],
  );
  if (rows.length > 0) return false;

  await pool.query(
    `INSERT INTO disease_favorite (user_id, disease_id) VALUES ($1, $2)`,
    [userId, diseaseId],
  );
  return true;
}

export interface FavoriteDisease {
  slug: string;
  canonicalName: string;
}

export async function getFavoriteDiseases(
  userId: string,
): Promise<FavoriteDisease[]> {
  const { rows } = await pool.query(
    `SELECT d.slug, d.canonical_name
     FROM disease_favorite df
     JOIN disease d ON d.id = df.disease_id
     WHERE df.user_id = $1
     ORDER BY d.canonical_name`,
    [userId],
  );
  return rows.map((r) => ({ slug: r.slug, canonicalName: r.canonical_name }));
}

export interface UserNote {
  diseaseSlug: string;
  diseaseName: string;
  body: string;
  updatedAt: string;
}

export async function getAllNotes(userId: string): Promise<UserNote[]> {
  const { rows } = await pool.query(
    `SELECT d.slug AS disease_slug, d.canonical_name AS disease_name, n.body, n.updated_at
     FROM note n
     JOIN disease d ON d.id = n.disease_id
     WHERE n.user_id = $1
     ORDER BY n.updated_at DESC`,
    [userId],
  );
  return rows.map((r) => ({
    diseaseSlug: r.disease_slug,
    diseaseName: r.disease_name,
    body: r.body,
    updatedAt:
      r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
  }));
}

export interface RecentlyViewedDisease {
  slug: string;
  canonicalName: string;
  viewedAt: string;
}

export async function getRecentlyViewed(
  userId: string,
  excludeDiseaseId?: string,
  limit = 5,
): Promise<RecentlyViewedDisease[]> {
  const { rows } = await pool.query(
    `SELECT d.slug, d.canonical_name, pv.viewed_at
     FROM page_view pv
     JOIN disease d ON d.id = pv.disease_id
     WHERE pv.user_id = $1 AND pv.disease_id IS DISTINCT FROM $2
     ORDER BY pv.viewed_at DESC
     LIMIT $3`,
    [userId, excludeDiseaseId ?? null, limit],
  );
  return rows.map((r) => ({
    slug: r.slug,
    canonicalName: r.canonical_name,
    viewedAt:
      r.viewed_at instanceof Date ? r.viewed_at.toISOString() : r.viewed_at,
  }));
}
