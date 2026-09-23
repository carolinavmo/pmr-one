import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import { sanitizeRichText } from "@/lib/rich-text";
import { getBreadcrumbPath } from "@/lib/topics";
import {
  SAMPLE_PAGE_TITLE,
  SAMPLE_PAGE_BODY,
  SAMPLE_PROTOCOL_TITLE,
  SAMPLE_PROTOCOL_BODY,
  SAMPLE_TEMPLATE_TITLE,
  SAMPLE_TEMPLATE_BODY,
} from "@/lib/atlas-sample-content";

// "My Clinical Handbook" — a member's own free-form notes, grouped into
// sections. Same pool.query pattern as study-planner.ts, no ORM. Every
// mutation re-checks ownership in the SQL itself (WHERE id = $x AND
// user_id = $y) rather than trusting a caller-supplied id alone.

export interface AtlasSection {
  id: string;
  name: string;
  color: CardColor;
  position: number;
  createdAt: string;
}

export interface AtlasPage {
  id: string;
  sectionId: string;
  title: string;
  body: string;
  position: number;
  updatedAt: string;
  isPinned: boolean;
  tags: string[];
  linkedDiseaseId: string | null;
  templatePageId: string | null;
}

// Header chip + context rail's "From the library" box (Pass 4) — a
// deliberately small, on-demand shape (not the full DiseaseCatalogEntry)
// fetched only for the currently-open page's own linked disease, via
// getLinkedDiseaseSummary below, rather than joined into every page in
// getAtlasWorkspace's initial fetch (most pages have no library link
// at all).
export interface LinkedDiseaseSummary {
  id: string;
  slug: string;
  canonicalName: string;
  reviewedAt: string | null;
  // "MSK › Elbow" — topics.ts's getBreadcrumbPath, joined; excludes the
  // disease's own name (the header chip appends that separately).
  breadcrumb: string;
}

// Pass 4's backlinks box — one other page that references the current
// one via a data-atlas-link-id="<id>" internal link (AtlasToolbar's
// link-to-page tool). Title + slug-less id is enough to render a row
// and jump straight to it (selection is client-side page id, no route).
export interface AtlasBacklink {
  id: string;
  title: string;
}

// Distinct starting colors so the 3 defaults read as visually separate
// right away, the same way default topics ship pre-assigned colors
// rather than all landing on the palette's neutral default.
const DEFAULT_SECTION_COLORS: CardColor[] = ["accent", "trust", "insight"];

function mapSectionRow(r: {
  id: string;
  name: string;
  color: CardColor;
  position: number;
  created_at: Date | string;
}): AtlasSection {
  return {
    id: r.id,
    name: r.name,
    color: r.color,
    position: r.position,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
  };
}

function mapPageRow(r: {
  id: string;
  section_id: string;
  title: string;
  body: string;
  position: number;
  updated_at: Date | string;
  is_pinned: boolean;
  tags: string[] | null;
  linked_disease_id: string | null;
  template_page_id: string | null;
}): AtlasPage {
  return {
    id: r.id,
    sectionId: r.section_id,
    title: r.title,
    body: r.body,
    position: r.position,
    updatedAt: r.updated_at instanceof Date ? r.updated_at.toISOString() : r.updated_at,
    isPinned: r.is_pinned,
    tags: r.tags ?? [],
    linkedDiseaseId: r.linked_disease_id,
    templatePageId: r.template_page_id,
  };
}

const PAGE_COLUMNS = "id, section_id, title, body, position, updated_at, is_pinned, tags, linked_disease_id, template_page_id";

// Seeds the 3 default sections (using the already-translated names the
// caller passes in) only the first time a member has zero sections —
// every visit after that is a no-op read. The defaults aren't a
// special "kind": once created they're ordinary rows a member can
// rename, recolor, or delete like any other.
export async function getAtlasWorkspace(
  userId: string,
  defaultSectionNames: [string, string, string]
): Promise<{ sections: AtlasSection[]; pages: AtlasPage[] }> {
  const { rows: existing } = await pool.query(
    `SELECT id FROM atlas_section WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  if (existing.length === 0) {
    const sectionIds: string[] = [];
    for (let i = 0; i < defaultSectionNames.length; i++) {
      const { rows } = await pool.query(
        `INSERT INTO atlas_section (user_id, name, color, position) VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, defaultSectionNames[i], DEFAULT_SECTION_COLORS[i], i]
      );
      sectionIds.push(rows[0].id);
    }
    await seedSampleContent(userId, sectionIds[0], sectionIds[1], sectionIds[2]);
  }

  const [{ rows: sectionRows }, { rows: pageRows }] = await Promise.all([
    pool.query(
      `SELECT id, name, color, position, created_at FROM atlas_section WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
      [userId]
    ),
    pool.query(
      `SELECT ${PAGE_COLUMNS} FROM atlas_page WHERE user_id = $1 ORDER BY position ASC, created_at ASC`,
      [userId]
    ),
  ]);

  return {
    sections: sectionRows.map(mapSectionRow),
    pages: pageRows.map(mapPageRow),
  };
}

// One worked example per default section — same condition throughout
// (lateral epicondylopathy) so a brand-new member can see how a note,
// a protocol, and a template actually differ, not just read empty
// section labels. Only ever called once, from getAtlasWorkspace's
// first-visit branch above — these become ordinary rows a member can
// edit or delete like any other page.
async function seedSampleContent(
  userId: string,
  pagesSectionId: string,
  protocolsSectionId: string,
  templatesSectionId: string
): Promise<void> {
  await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position) VALUES ($1, $2, $3, $4, 0)`,
    [userId, pagesSectionId, SAMPLE_PAGE_TITLE, sanitizeRichText(SAMPLE_PAGE_BODY)]
  );
  await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position) VALUES ($1, $2, $3, $4, 0)`,
    [userId, protocolsSectionId, SAMPLE_PROTOCOL_TITLE, sanitizeRichText(SAMPLE_PROTOCOL_BODY)]
  );
  await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position) VALUES ($1, $2, $3, $4, 0)`,
    [userId, templatesSectionId, SAMPLE_TEMPLATE_TITLE, sanitizeRichText(SAMPLE_TEMPLATE_BODY)]
  );
}

export async function createSection(userId: string, name: string): Promise<AtlasSection> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_section WHERE user_id = $1`,
    [userId]
  );
  const { rows } = await pool.query(
    `INSERT INTO atlas_section (user_id, name, position) VALUES ($1, $2, $3)
     RETURNING id, name, color, position, created_at`,
    [userId, name, countRows[0].count]
  );
  return mapSectionRow(rows[0]);
}

export async function renameSection(userId: string, sectionId: string, name: string): Promise<void> {
  await pool.query(`UPDATE atlas_section SET name = $1 WHERE id = $2 AND user_id = $3`, [
    name,
    sectionId,
    userId,
  ]);
}

export async function updateSectionColor(
  userId: string,
  sectionId: string,
  color: CardColor
): Promise<void> {
  await pool.query(`UPDATE atlas_section SET color = $1 WHERE id = $2 AND user_id = $3`, [
    color,
    sectionId,
    userId,
  ]);
}

export async function deleteSection(userId: string, sectionId: string): Promise<void> {
  await pool.query(`DELETE FROM atlas_section WHERE id = $1 AND user_id = $2`, [sectionId, userId]);
}

// `orderedIds` is the full new order for the caller's section list —
// simpler and more robust than a single up/down neighbor swap (no
// unique constraint on `position` here, so there's no collision to
// dance around the way disease-page block reordering has to).
export async function reorderSections(userId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE atlas_section SET position = $1 WHERE id = $2 AND user_id = $3`, [
      i,
      orderedIds[i],
      userId,
    ]);
  }
}

export async function reorderPages(
  userId: string,
  sectionId: string,
  orderedIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE atlas_page SET position = $1 WHERE id = $2 AND user_id = $3 AND section_id = $4`,
      [i, orderedIds[i], userId, sectionId]
    );
  }
}

// templatePageId (Pass 4's "start from template") copies that page's
// body in as the new page's starting content and records the lineage
// — ownership-checked (WHERE user_id = $1) same as every other read
// here, so a page id from a different member can't be used as a
// template source.
export async function createPage(
  userId: string,
  sectionId: string,
  title: string,
  templatePageId?: string
): Promise<AtlasPage> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`,
    [sectionId]
  );
  let templateBody = "";
  if (templatePageId) {
    const { rows: templateRows } = await pool.query(
      `SELECT body FROM atlas_page WHERE id = $1 AND user_id = $2`,
      [templatePageId, userId]
    );
    templateBody = templateRows[0]?.body ?? "";
  }
  const { rows } = await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position, template_page_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${PAGE_COLUMNS}`,
    [userId, sectionId, title, templateBody, countRows[0].count, templatePageId ?? null]
  );
  return mapPageRow(rows[0]);
}

export async function renamePage(userId: string, pageId: string, title: string): Promise<void> {
  await pool.query(`UPDATE atlas_page SET title = $1, updated_at = now() WHERE id = $2 AND user_id = $3`, [
    title,
    pageId,
    userId,
  ]);
}

// Moved pages always land at the end of their new section — appending
// via a fresh COUNT(*) avoids colliding with positions already in use
// there (the source section's own positions are left with a gap, which
// is harmless since ordering only ever reads relative order, not
// contiguous values).
export async function movePage(userId: string, pageId: string, sectionId: string): Promise<void> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`,
    [sectionId]
  );
  await pool.query(
    `UPDATE atlas_page SET section_id = $1, position = $2, updated_at = now() WHERE id = $3 AND user_id = $4`,
    [sectionId, countRows[0].count, pageId, userId]
  );
}

export async function togglePagePinned(userId: string, pageId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `UPDATE atlas_page SET is_pinned = NOT is_pinned WHERE id = $1 AND user_id = $2 RETURNING is_pinned`,
    [pageId, userId]
  );
  return rows[0]?.is_pinned ?? false;
}

export async function updatePageBody(userId: string, pageId: string, body: string): Promise<void> {
  await pool.query(`UPDATE atlas_page SET body = $1, updated_at = now() WHERE id = $2 AND user_id = $3`, [
    body,
    pageId,
    userId,
  ]);
}

export async function deletePage(userId: string, pageId: string): Promise<void> {
  await pool.query(`DELETE FROM atlas_page WHERE id = $1 AND user_id = $2`, [pageId, userId]);
}

export async function updatePageTags(userId: string, pageId: string, tags: string[]): Promise<void> {
  await pool.query(`UPDATE atlas_page SET tags = $1, updated_at = now() WHERE id = $2 AND user_id = $3`, [
    tags,
    pageId,
    userId,
  ]);
}

// null clears the link (HANDBOOK-SPEC.md's context-rail "Remove
// library link"). Doesn't touch updated_at — same reasoning
// togglePagePinned already established: a metadata change isn't "the
// note itself changed," so it shouldn't bump "Edited X ago" or count
// as a Recent-filter hit.
export async function setPageLinkedDisease(
  userId: string,
  pageId: string,
  diseaseId: string | null
): Promise<void> {
  await pool.query(`UPDATE atlas_page SET linked_disease_id = $1 WHERE id = $2 AND user_id = $3`, [
    diseaseId,
    pageId,
    userId,
  ]);
}

// Pass 4's header chip + "From the library" context-rail box — a
// small on-demand shape, not joined into every page in
// getAtlasWorkspace (see LinkedDiseaseSummary's own comment).
export async function getLinkedDiseaseSummary(diseaseId: string): Promise<LinkedDiseaseSummary | null> {
  const { rows } = await pool.query(
    `SELECT id, slug, canonical_name, reviewed_at FROM disease WHERE id = $1`,
    [diseaseId]
  );
  const row = rows[0];
  if (!row) return null;
  const breadcrumbPath = await getBreadcrumbPath(row.slug);
  return {
    id: row.id,
    slug: row.slug,
    canonicalName: row.canonical_name,
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at).toISOString() : null,
    breadcrumb: breadcrumbPath.map((t) => t.name).join(" › "),
  };
}

// Pass 4's "Linked from" — every OTHER page of this member's whose
// body contains an internal link back to `pageId` (AtlasToolbar's
// link-to-page tool writes data-atlas-link-id="<id>" — see
// rich-text.ts). A plain LIKE scan, not a join table: a member's own
// handbook is small (tens of pages, not thousands), and this is read
// once per page-open, not on every keystroke.
export async function getBacklinksForPage(userId: string, pageId: string): Promise<AtlasBacklink[]> {
  const { rows } = await pool.query(
    `SELECT id, title FROM atlas_page
     WHERE user_id = $1 AND id != $2 AND body LIKE '%data-atlas-link-id="' || $2 || '"%'
     ORDER BY updated_at DESC`,
    [userId, pageId]
  );
  return rows.map((r) => ({ id: r.id, title: r.title }));
}

// Pass 4's "Save as template" — duplicates the CURRENT page's body
// into a new page inside the Templates section (found by name match
// against the same translated default-section names getAtlasWorkspace
// seeds with; falls back to the last section if a member has renamed
// or deleted their Templates folder, rather than failing outright).
export async function duplicatePageAsTemplate(
  userId: string,
  pageId: string,
  templatesSectionName: string,
  newTitle: string
): Promise<AtlasPage> {
  const { rows: sourceRows } = await pool.query(`SELECT body FROM atlas_page WHERE id = $1 AND user_id = $2`, [
    pageId,
    userId,
  ]);
  const body = sourceRows[0]?.body ?? "";

  const { rows: sectionRows } = await pool.query(
    `SELECT id FROM atlas_section WHERE user_id = $1 AND name = $2 LIMIT 1`,
    [userId, templatesSectionName]
  );
  const fallback = await pool.query(
    `SELECT id FROM atlas_section WHERE user_id = $1 ORDER BY position DESC LIMIT 1`,
    [userId]
  );
  const sectionId = sectionRows[0]?.id ?? fallback.rows[0]?.id;
  if (!sectionId) throw new Error("No section available to save the template into.");

  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM atlas_page WHERE section_id = $1`, [
    sectionId,
  ]);
  const { rows } = await pool.query(
    `INSERT INTO atlas_page (user_id, section_id, title, body, position)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${PAGE_COLUMNS}`,
    [userId, sectionId, newTitle, body, countRows[0].count]
  );
  return mapPageRow(rows[0]);
}
