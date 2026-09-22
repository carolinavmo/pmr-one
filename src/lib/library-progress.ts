import { pool } from "@/lib/db";
import { isPageRead } from "@/lib/workspace";
import { getSectionIndex } from "@/lib/disease-loader";
import {
  getLibraryForest,
  groupRootsByArea,
  countDescendantPages,
  flattenPages,
  resolveThumbnail,
  findRegionContaining,
  AREA_ORDER,
  AREA_COLOR,
  type LibraryTreeNode,
  type LibraryThumbnail,
} from "@/lib/library-home";

// Pass 2 (design/LIBRARY-HOME-MIX-SPEC.md) — "Your progress" and
// "Continue reading." Two pieces of the spec's own data audit are
// genuinely missing and stay hidden/degraded rather than faked:
//   - Question Bank results aren't tagged by area or region anywhere
//     (question_category/question_set are free-standing, no link to
//     `topic`) — every Q-bank chip below reads "—", and "where to go
//     next" rule 1 (an area's Q-bank score < 70%) can never fire.
//   - The 12-week activity grid and streak need one row per user per
//     day; `reading_progress` only keeps one row per user+disease
//     (upserted), so a page read on two different days collapses to
//     whichever day it was last touched — not a real daily log.
//     Building the grid from that would misrepresent activity, so
//     it's left out entirely rather than approximated.

export interface OverallProgress {
  pagesRead: number;
  totalPages: number;
  percentOfLibrary: number;
  pagesThisWeek: number;
  foldersCompleted: number;
  questionsAnswered: number;
}

export interface AreaProgressRow {
  area: string;
  color: string;
  read: number;
  total: number;
  qbankLabel: string;
  qbankTone: "strong" | "review" | "none";
}

export interface RecentlyCompletedItem {
  slug: string;
  title: string;
}

export interface NextSuggestion {
  reason: string;
  detail: string;
  buttonLabel: string;
  href: string;
}

export interface YourProgressData {
  hasHistory: boolean;
  overall: OverallProgress;
  byArea: AreaProgressRow[];
  recentlyCompleted: RecentlyCompletedItem[];
  nextSuggestions: NextSuggestion[];
}

export interface ContinueReadingItem {
  slug: string;
  title: string;
  currentSectionLabel: string | null;
  percent: number;
  thumbnail: LibraryThumbnail;
  areaColor: string | null;
}

interface ProgressRow {
  disease_id: string;
  scroll_ratio: number;
  updated_at: string;
}

// A folder "completed" once every page inside it is read — walks the
// whole forest (every area, not just the one currently browsed), so
// the ring's "N folders completed" reflects the library as a whole.
// Only counts actual folders (a region's children), never a region
// itself — otherwise a region whose only folder is fully read would
// double-count as "region complete" too, since a region with no loose
// pages of its own is trivially 100% read the moment its one folder
// is.
function countCompletedFolders(regions: LibraryTreeNode[], read: Set<string>): number {
  let count = 0;
  for (const region of regions) {
    for (const folder of region.children) {
      const pages = flattenPages([folder]);
      if (pages.length > 0 && pages.every((p) => read.has(p.id))) count++;
    }
  }
  return count;
}

function findFirstUnreadPage(nodes: LibraryTreeNode[], read: Set<string>): { id: string; slug: string } | null {
  for (const node of nodes) {
    for (const page of node.pages) {
      if (!read.has(page.id)) return page;
    }
    const inChildren = findFirstUnreadPage(node.children, read);
    if (inChildren) return inChildren;
  }
  return null;
}

export async function getYourProgressData(
  userId: string,
  includeUnpublished: boolean
): Promise<YourProgressData> {
  const [roots, { rows: progressRows }, { rows: questionCountRows }] = await Promise.all([
    getLibraryForest(includeUnpublished),
    pool.query<ProgressRow>(
      `SELECT disease_id, scroll_ratio, updated_at FROM reading_progress WHERE user_id = $1`,
      [userId]
    ),
    pool.query<{ count: string }>(`SELECT count(*) FROM question_attempt WHERE user_id = $1`, [userId]),
  ]);

  const areasByName = groupRootsByArea(roots);
  const readIds = new Set(
    progressRows.filter((r) => isPageRead(Number(r.scroll_ratio))).map((r) => r.disease_id)
  );

  const allRegions = [...areasByName.values()].flat();
  const totalPages = allRegions.reduce((sum, r) => sum + countDescendantPages(r), 0);
  const pagesRead = readIds.size;

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const pagesThisWeek = progressRows.filter(
    (r) => isPageRead(Number(r.scroll_ratio)) && new Date(r.updated_at).getTime() >= oneWeekAgo
  ).length;

  const foldersCompleted = countCompletedFolders(allRegions, readIds);
  const questionsAnswered = Number(questionCountRows[0]?.count ?? 0);

  const byArea: AreaProgressRow[] = AREA_ORDER.map((name) => {
    const regions = areasByName.get(name) ?? [];
    const total = regions.reduce((sum, r) => sum + countDescendantPages(r), 0);
    const read = flattenPages(regions).filter((p) => readIds.has(p.id)).length;
    return {
      area: name,
      color: AREA_COLOR[name],
      read,
      total,
      // Q-bank isn't tagged by area (see file-level comment) — every
      // row reads "not tested yet" rather than a guessed score.
      qbankLabel: "—",
      qbankTone: "none" as const,
    };
  }).filter((row) => row.total > 0);

  const { rows: recentRows } = await pool.query<{ slug: string; canonical_name: string }>(
    `SELECT d.slug, d.canonical_name FROM reading_progress rp
     JOIN disease d ON d.id = rp.disease_id
     WHERE rp.user_id = $1 AND rp.scroll_ratio >= 0.995
     ORDER BY rp.updated_at DESC LIMIT 6`,
    [userId]
  );
  const recentlyCompleted: RecentlyCompletedItem[] = recentRows.map((r) => ({
    slug: r.slug,
    title: r.canonical_name,
  }));

  // "Where to go next" — rule 1 (an area's Q-bank score below 70%)
  // can't run without area-tagged Q-bank data; suggestions come from
  // rules 2 and 3 only.
  const suggestions: NextSuggestion[] = [];

  for (const name of AREA_ORDER) {
    if (suggestions.length >= 2) break;
    const regions = areasByName.get(name) ?? [];
    const total = regions.reduce((sum, r) => sum + countDescendantPages(r), 0);
    if (total === 0) continue;
    const read = flattenPages(regions).filter((p) => readIds.has(p.id)).length;
    if (read > 0) continue; // already started
    const firstRegionWithPages = regions.find((r) => countDescendantPages(r) > 0);
    if (!firstRegionWithPages) continue;
    const firstPage = findFirstUnreadPage([firstRegionWithPages], readIds);
    if (!firstPage) continue;
    suggestions.push({
      reason: `You haven't started ${name}`,
      detail: `Start with ${firstRegionWithPages.name}`,
      buttonLabel: "Start",
      href: `/conditions/${firstPage.slug}`,
    });
  }

  if (suggestions.length < 2 && progressRows.length > 0) {
    const mostRecent = [...progressRows].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
    let areaOfMostRecent: string | null = null;
    for (const name of AREA_ORDER) {
      const ids = flattenPages(areasByName.get(name) ?? []).map((p) => p.id);
      if (ids.includes(mostRecent.disease_id)) {
        areaOfMostRecent = name;
        break;
      }
    }
    if (areaOfMostRecent) {
      const regions = areasByName.get(areaOfMostRecent) ?? [];
      const nextPage = findFirstUnreadPage(regions, readIds);
      if (nextPage && !suggestions.some((s) => s.href === `/conditions/${nextPage.slug}`)) {
        suggestions.push({
          reason: `Continue in ${areaOfMostRecent}`,
          detail: "Pick up the next unread page",
          buttonLabel: "Continue",
          href: `/conditions/${nextPage.slug}`,
        });
      }
    }
  }

  return {
    hasHistory: progressRows.length > 0,
    overall: {
      pagesRead,
      totalPages,
      percentOfLibrary: totalPages > 0 ? Math.round((pagesRead / totalPages) * 100) : 0,
      pagesThisWeek,
      foldersCompleted,
      questionsAnswered,
    },
    byArea,
    recentlyCompleted,
    nextSuggestions: suggestions.slice(0, 2),
  };
}

// Three most recently touched unfinished pages, newest first — each
// with its current section (from getSectionIndex, same source the
// reading dock itself uses) and percent scrolled.
export async function getContinueReadingData(
  userId: string,
  limit = 3
): Promise<ContinueReadingItem[]> {
  const { rows } = await pool.query<{
    disease_id: string;
    slug: string;
    canonical_name: string;
    last_section_id: string | null;
    scroll_ratio: number;
  }>(
    `SELECT d.id AS disease_id, d.slug, d.canonical_name, rp.last_section_id, rp.scroll_ratio
     FROM reading_progress rp
     JOIN disease d ON d.id = rp.disease_id
     WHERE rp.user_id = $1 AND rp.scroll_ratio > 0 AND rp.scroll_ratio < 0.995
     ORDER BY rp.updated_at DESC LIMIT $2`,
    [userId, limit]
  );
  if (rows.length === 0) return [];

  // Already gated — a reading_progress row only exists for a page
  // this user was able to open, so region-sibling lookups can safely
  // include drafts too (the thumbnail borrows an image, never exposes
  // which page it came from).
  const roots = await getLibraryForest(true);
  const areasByName = groupRootsByArea(roots);

  return Promise.all(
    rows.map(async (row): Promise<ContinueReadingItem> => {
      let currentSectionLabel: string | null = null;
      const index = await getSectionIndex(row.slug, true);
      if (index && row.last_section_id) {
        const topLevelIndex = index.sections.findIndex(
          (s) => s.id === row.last_section_id || s.subsections.some((sub) => sub.id === row.last_section_id)
        );
        if (topLevelIndex >= 0) {
          currentSectionLabel = `Section ${topLevelIndex + 1} of ${index.sections.length}`;
        }
      }

      const region = findRegionContaining(roots, row.disease_id);
      const siblingIds = region
        ? flattenPages([region]).map((p) => p.id).filter((id) => id !== row.disease_id)
        : [];
      const thumbnail = await resolveThumbnail(row.disease_id, siblingIds);

      let areaColor: string | null = null;
      for (const name of AREA_ORDER) {
        if ((areasByName.get(name) ?? []).some((r) => r === region)) {
          areaColor = AREA_COLOR[name];
          break;
        }
      }

      return {
        slug: row.slug,
        title: row.canonical_name,
        currentSectionLabel,
        percent: Math.round(Number(row.scroll_ratio) * 100),
        thumbnail,
        areaColor,
      };
    })
  );
}
