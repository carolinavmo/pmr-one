import { pool } from "@/lib/db";
import { getDiseaseBySlug } from "@/lib/disease-loader";
import { getPublishedDiseases, type DiseaseCatalogEntry } from "@/lib/disease-catalog";
import { splitIntoSections } from "@/lib/sections";
import { slugify } from "@/lib/slugify";
import { stripLeadingNumber } from "@/lib/heading-number";

// HANDBOOK-SPEC.md Pass 5 — "＋ Pull from library" opens a search over
// library pages; choosing a page lists its sections; choosing a
// section inserts a quoted block with attribution." The search itself
// just filters getPublishedDiseases() (disease-catalog.ts) client-side
// — the catalog is a few hundred rows at most, not worth a dedicated
// full-text query.
export async function searchLibraryPages(query: string, limit = 20): Promise<DiseaseCatalogEntry[]> {
  const all = await getPublishedDiseases();
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, limit);
  return all.filter((d) => d.canonicalName.toLowerCase().includes(q)).slice(0, limit);
}

export interface LibraryQuoteSection {
  id: string;
  heading: string;
  // Only paragraph blocks' own rich-text bodies, concatenated — a
  // section built entirely from a table/highlight-card/exam-list has
  // no plain running text to quote and comes back empty; the picker
  // hides an empty section rather than inserting an attribution with
  // nothing under it.
  quoteHtml: string;
}

export interface LibraryPullPage {
  diseaseId: string;
  diseaseSlug: string;
  diseaseName: string;
  reviewedAt: string | null;
  sections: LibraryQuoteSection[];
}

export async function getLibraryPullPage(slug: string): Promise<LibraryPullPage | null> {
  const disease = await getDiseaseBySlug(slug);
  if (!disease) return null;

  const sections = splitIntoSections(disease.blocks)
    .filter((s) => s.headingBlock !== null)
    .map((s) => {
      const quoteHtml = s.blocks
        .filter((b): b is Extract<typeof b, { type: "paragraph" }> => b.type === "paragraph")
        .map((b) => `<p>${b.body}</p>`)
        .join("");
      return {
        id: slugify(s.headingBlock!.text),
        heading: stripLeadingNumber(s.headingBlock!.text),
        quoteHtml,
      };
    })
    .filter((s) => s.quoteHtml.trim().length > 0);

  // getDiseaseBySlug's own DiseaseData doesn't carry reviewed_at (it's
  // an editorial field disease-catalog.ts reads separately, not
  // updated_at — a real, different column) — one small direct query
  // rather than pulling in the whole catalog just for this field.
  const { rows } = await pool.query<{ reviewed_at: string | null }>(
    `SELECT reviewed_at FROM disease WHERE id = $1`,
    [disease.id]
  );

  return {
    diseaseId: disease.id,
    diseaseSlug: disease.slug,
    diseaseName: disease.canonicalName,
    reviewedAt: rows[0]?.reviewed_at ? new Date(rows[0].reviewed_at).toISOString() : null,
    sections,
  };
}
