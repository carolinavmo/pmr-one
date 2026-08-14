import { pool } from "@/lib/db";
import { iconForRegions } from "@/lib/disease-icons";
import type { CardIconName } from "@/components/ui/cardIcons";

export interface DiseaseCatalogEntry {
  id: string;
  canonicalName: string;
  slug: string;
  status: string;
  reviewedAt: string | null;
  snippet: string;
  icon: CardIconName | undefined;
}

// Shared by the homepage, /conditions, and /api/search — all three
// need "disease + a one-line snippet + a region-derived icon" and
// would otherwise duplicate the same subqueries three times.
const CATALOG_QUERY = `
  SELECT d.id, d.canonical_name, d.slug, d.status, d.reviewed_at,
    (
      SELECT eb.content_config->>'body'
      FROM editorial_block eb
      WHERE eb.disease_id = d.id AND eb.block_type = 'paragraph'
      ORDER BY eb.position
      LIMIT 1
    ) AS snippet,
    (
      SELECT array_agg(DISTINCT a.region)
      FROM illustration_usage iu
      JOIN illustration_depicts_anatomy ida ON ida.medical_illustration_id = iu.medical_illustration_id
      JOIN anatomy_structure a ON a.id = ida.anatomy_structure_id
      WHERE iu.target_type = 'disease' AND iu.target_id = d.id
    ) AS regions
  FROM disease d
`;

// The stored paragraph body is rich-text HTML (RichEditableText) —
// every catalog-card consumer just wants a plain-text teaser line, so
// tags are stripped here once rather than in each card component.
function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function mapRow(row: {
  id: string;
  canonical_name: string;
  slug: string;
  status: string;
  reviewed_at: string | null;
  snippet: string | null;
  regions: (string | null)[] | null;
}): DiseaseCatalogEntry {
  return {
    id: row.id,
    canonicalName: row.canonical_name,
    slug: row.slug,
    status: row.status,
    reviewedAt: row.reviewed_at,
    snippet: row.snippet ? stripHtmlTags(row.snippet).slice(0, 140) : "Disease Page",
    icon: iconForRegions(row.regions ?? []),
  };
}

export async function getPublishedDiseases(): Promise<DiseaseCatalogEntry[]> {
  const { rows } = await pool.query(
    `${CATALOG_QUERY} WHERE d.status = 'published' ORDER BY d.canonical_name`
  );
  return rows.map(mapRow);
}

export async function getAllDiseasesForCatalog(): Promise<DiseaseCatalogEntry[]> {
  const { rows } = await pool.query(`${CATALOG_QUERY} ORDER BY d.canonical_name`);
  return rows.map(mapRow);
}

// Member dashboard's "New Conditions" section — most-recently-published
// first. Falls back to created_at for any row published before
// published_at started being set on the publish action, so a real
// disease never silently drops out of "new" for lacking the column.
export async function getRecentlyPublishedDiseases(
  limit: number,
): Promise<DiseaseCatalogEntry[]> {
  const { rows } = await pool.query(
    `${CATALOG_QUERY} WHERE d.status = 'published'
     ORDER BY COALESCE(d.published_at, d.created_at) DESC
     LIMIT $1`,
    [limit],
  );
  return rows.map(mapRow);
}

export interface PlatformStats {
  conditions: number;
  examinationManeuvers: number;
  clinicalPearls: number;
  references: number;
}

// Real counts only — no rounding up, no "+", no invented numbers.
// Conditions counts published diseases only (what a visitor can
// actually reach); the other three count everything authored, since
// they're not individually publish-gated the way a disease is.
export async function getPlatformStats(): Promise<PlatformStats> {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*) FROM disease WHERE status = 'published') AS conditions,
      (SELECT count(*) FROM examination_maneuver) AS examination_maneuvers,
      (SELECT count(*) FROM clinical_pearl_editorial) AS clinical_pearls,
      (SELECT count(*) FROM reference) AS references
  `);
  const row = rows[0];
  return {
    conditions: Number(row.conditions),
    examinationManeuvers: Number(row.examination_maneuvers),
    clinicalPearls: Number(row.clinical_pearls),
    references: Number(row.references),
  };
}
