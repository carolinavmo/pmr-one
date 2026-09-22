import { cache } from "react";
import { unstable_cache, updateTag } from "next/cache";
import { pool } from "@/lib/db";
import type { DiseasePageType } from "@/lib/disease-page-type";
import { estimateReadingMinutesFromValues } from "@/lib/reading-time";
import { isPageRead, isDiseaseFavorited } from "@/lib/workspace";
import { getBreadcrumbPath } from "@/lib/topics";
import type { LibrarySort } from "@/lib/library-sort";

// Re-exported as a *type* only (erased at compile time) so a client
// component can still `import type { LibrarySort } from
// "@/lib/library-home"` without pulling this module's `pool` import
// into its bundle. The sort vocabulary's runtime values
// (LIBRARY_SORT_ORDER, LIBRARY_SORT_LABEL, isLibrarySort) live only in
// library-sort.ts — import those from there directly, server or
// client, never through this file.
export type { LibrarySort };

// Time-of-day heuristic off the rendering environment's own clock
// (server on Railway, effectively UTC) — same rough approach every
// "Good morning"-style greeting in this app's design references
// takes, not a per-visitor-timezone lookup. `name` is used exactly as
// `session.user.name` reads — no invented title/first-name split.
// TODO(library-home): `users` has only a single optional free-text
// `name`, no structured title/first_name fields (design/
// LIBRARY-HOME-MIX-SPEC.md wants "Good afternoon, Dr. Carolina"). Add
// those columns and switch this to title + first name once they
// exist; until then this reads the full name as-is, or omits it.
export function greetForHour(
  hour: number,
  name: string | null | undefined,
  isFirstVisit = false
): string {
  if (isFirstVisit) return name ? `Welcome, ${name}` : "Welcome";
  const timeOfDay = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  return name ? `Good ${timeOfDay}, ${name}` : `Good ${timeOfDay}`;
}

// The library home's "Browse by area" data layer (design/
// LIBRARY-HOME-MIX-SPEC.md, Pass 1) — reuses the same topic-tree
// shape topics.ts's getTopicTree() already walks (separator = Area,
// root topic = Region, its children = Folders, `disease` rows =
// Pages), but written independently here rather than extending that
// shared function, since this needs `type` and per-page reading time
// that the sidebar's own tree never has to carry.

// Fixed order and colour per area (design spec's --bs/--msk/--neu/--oth
// tokens) — areas are a small, editorially fixed taxonomy, not
// something derived or author-colorable, so this stays a plain map
// keyed by the separator's exact name rather than a stored field.
export const AREA_ORDER = ["MSK", "Neurology", "Basic Sciences", "Other Topics"] as const;
export const AREA_COLOR: Record<string, string> = {
  MSK: "#A8760F",
  Neurology: "#5A479C",
  "Basic Sciences": "#0F8A6E",
  "Other Topics": "#1F7A4D",
};

// Pass 2's progress column — "leave the column in place, empty" (Pass
// 1) becomes real per-user state here. `unread` still carries the
// page's own reading time (grey label), same value Pass 1 already
// showed; `read`/`inProgress` are only possible when a userId was
// passed to getLibraryBrowseData at all.
export type LibraryPageProgress =
  | { state: "unread"; readingMinutes: number }
  | { state: "read" }
  | { state: "inProgress"; percent: number; minutesLeft: number };

// "NEW for pages published in the last 30 days, UPDATED for pages
// reviewed in the last 30 days, never both" (design/LIBRARY-HOME-MIX-SPEC.md,
// Pass 4) — published_at wins the tie when a page is both freshly
// published and freshly reviewed, since "new" is the stronger claim.
const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type LibraryPageContentTag = "new" | "updated" | null;

function computeContentTag(publishedAt: string | null, reviewedAt: string | null): LibraryPageContentTag {
  const now = Date.now();
  if (publishedAt && now - new Date(publishedAt).getTime() <= RECENT_WINDOW_MS) return "new";
  if (reviewedAt && now - new Date(reviewedAt).getTime() <= RECENT_WINDOW_MS) return "updated";
  return null;
}

function sortTreePages(pages: LibraryTreePage[], sort: LibrarySort): LibraryTreePage[] {
  if (sort === "reading_order") return pages; // already position-ordered from the query
  const sorted = [...pages];
  if (sort === "alpha") sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "recently_updated") {
    sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
  // "shortest" needs reading minutes, computed after this point in
  // getLibraryBrowseData — applied there instead of here.
  return sorted;
}

export interface LibraryPageRow {
  slug: string;
  title: string;
  type: DiseasePageType | null;
  readingMinutes: number;
  progress: LibraryPageProgress;
  contentTag: LibraryPageContentTag;
}

export interface LibraryFolderGroup {
  name: string;
  pages: LibraryPageRow[];
}

export interface LibraryAreaSummary {
  key: string;
  label: string;
  count: number;
  color: string | null;
}

export interface LibraryRegionSummary {
  slug: string;
  name: string;
  count: number;
}

export interface LibraryTypeChipCount {
  type: DiseasePageType;
  count: number;
}

export interface LibraryBrowseData {
  totalPages: number;
  areas: LibraryAreaSummary[];
  activeArea: string | null;
  regions: LibraryRegionSummary[];
  activeRegion: string | null;
  activeRegionName: string | null;
  folders: LibraryFolderGroup[];
  loosePages: LibraryPageRow[];
  typeChips: LibraryTypeChipCount[];
  activeType: DiseasePageType | null;
  sort: LibrarySort;
  hideRead: boolean;
}

interface TopicRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  position: number;
  kind: string;
}

interface DiseaseRow {
  id: string;
  slug: string;
  canonical_name: string;
  topic_id: string;
  type: DiseasePageType | null;
  position: number;
  published_at: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

export interface LibraryTreePage {
  id: string;
  slug: string;
  name: string;
  type: DiseasePageType | null;
  publishedAt: string | null;
  reviewedAt: string | null;
  updatedAt: string;
}

export interface LibraryTreeNode {
  id: string;
  slug: string;
  name: string;
  kind: string;
  position: number;
  children: LibraryTreeNode[];
  pages: LibraryTreePage[];
}

type Node = LibraryTreeNode;

function buildForest(topicRows: TopicRow[], diseaseRows: DiseaseRow[]): Node[] {
  const nodesById = new Map<string, Node>();
  for (const row of topicRows) {
    nodesById.set(row.id, {
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      position: row.position,
      children: [],
      pages: [],
    });
  }
  for (const row of diseaseRows) {
    nodesById.get(row.topic_id)?.pages.push({
      id: row.id,
      slug: row.slug,
      name: row.canonical_name,
      type: row.type,
      publishedAt: row.published_at,
      reviewedAt: row.reviewed_at,
      updatedAt: row.updated_at,
    });
  }
  const roots: Node[] = [];
  for (const row of topicRows) {
    const node = nodesById.get(row.id)!;
    if (row.parent_id) nodesById.get(row.parent_id)?.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export function countDescendantPages(node: Node): number {
  return node.pages.length + node.children.reduce((sum, c) => sum + countDescendantPages(c), 0);
}

// Root topics between one separator and the next belong to that
// separator's area — a separator never has children/diseases of its
// own (topics.ts's own TopicKind comment), it's purely a label.
export function groupRootsByArea(roots: Node[]): Map<string, Node[]> {
  const areas = new Map<string, Node[]>();
  let current: string | null = null;
  for (const root of roots) {
    if (root.kind === "separator") {
      current = root.name;
      if (!areas.has(current)) areas.set(current, []);
      continue;
    }
    if (!current) continue; // a region before any separator has no area — shouldn't happen, skip rather than guess
    areas.get(current)!.push(root);
  }
  return areas;
}

// Pass 4's "counts and per-area progress come from cached aggregates,
// not from counting pages on each request" — this tree walk (every
// topic + every disease, joined and re-nested) is the base every
// count in Browse by area and Your progress derives from, and it's
// identical for every visitor of the same role, so it's the one worth
// caching across requests rather than per-request-only. `unstable_cache`
// gives the cross-request layer (tagged "library-tree", invalidated by
// name from every action that changes the topic tree or a disease's
// status/type — see revalidateLibraryTree() below); React's `cache()`
// on top just dedupes the handful of calls within one render (Browse
// by area and Your progress both need it) down to one cache read.
const getLibraryForestCached = unstable_cache(
  async (includeUnpublished: boolean): Promise<Node[]> => {
    const [{ rows: topicRows }, { rows: diseaseRows }] = await Promise.all([
      pool.query<TopicRow>(`SELECT id, slug, name, parent_id, position, kind FROM topic ORDER BY position, name`),
      pool.query<DiseaseRow>(
        `SELECT id, slug, canonical_name, topic_id, type, position, published_at, reviewed_at, updated_at
         FROM disease
         WHERE topic_id IS NOT NULL ${includeUnpublished ? "" : "AND status = 'published'"}
         ORDER BY position, canonical_name`
      ),
    ]);
    return buildForest(topicRows, diseaseRows);
  },
  ["library-forest"],
  { tags: ["library-tree"], revalidate: 300 }
);

export const getLibraryForest = cache(getLibraryForestCached);

// Called by every action that changes what the tree/counts show:
// topic create/rename/move/delete, a disease's status (publish/
// unpublish), type, or topic_id (re-parent). Not called for per-user
// writes (reading progress, favorites, topic-of-week) — those never
// change a count. `updateTag` (not `revalidateTag`) — every call site
// is a Server Action, so read-your-own-writes semantics are what's
// wanted: an editor who just published a page shouldn't see stale
// counts on their own next /library load.
export function revalidateLibraryTree() {
  updateTag("library-tree");
}

async function fetchTypeChips(includeUnpublished: boolean): Promise<LibraryTypeChipCount[]> {
  const { rows } = await pool.query<{ type: DiseasePageType; count: string }>(
    `SELECT type, count(*) FROM disease
     WHERE type IS NOT NULL ${includeUnpublished ? "" : "AND status = 'published'"}
     GROUP BY type`
  );
  // "Hide, don't fake" — a type with zero pages simply isn't in this
  // result at all (the query only returns types that occur), so no
  // separate empty-count filter is needed here.
  return rows.map((r) => ({ type: r.type, count: Number(r.count) }));
}

async function fetchReadingMinutes(diseaseIds: string[]): Promise<Map<string, number>> {
  if (diseaseIds.length === 0) return new Map();
  const { rows } = await pool.query<{ disease_id: string; content_config: Record<string, unknown> }>(
    `SELECT disease_id, content_config FROM editorial_block WHERE disease_id = ANY($1)`,
    [diseaseIds]
  );
  const byDisease = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const list = byDisease.get(row.disease_id) ?? [];
    list.push(row.content_config);
    byDisease.set(row.disease_id, list);
  }
  const minutes = new Map<string, number>();
  for (const id of diseaseIds) {
    minutes.set(id, estimateReadingMinutesFromValues(byDisease.get(id) ?? []));
  }
  return minutes;
}

async function fetchProgressByDiseaseId(
  userId: string | undefined,
  diseaseIds: string[]
): Promise<Map<string, number>> {
  if (!userId || diseaseIds.length === 0) return new Map();
  const { rows } = await pool.query<{ disease_id: string; scroll_ratio: number }>(
    `SELECT disease_id, scroll_ratio FROM reading_progress WHERE user_id = $1 AND disease_id = ANY($2)`,
    [userId, diseaseIds]
  );
  return new Map(rows.map((r) => [r.disease_id, Number(r.scroll_ratio)]));
}

function toPageProgress(
  scrollRatio: number | undefined,
  readingMinutes: number
): LibraryPageProgress {
  if (scrollRatio === undefined || scrollRatio <= 0) return { state: "unread", readingMinutes };
  if (isPageRead(scrollRatio)) return { state: "read" };
  return {
    state: "inProgress",
    percent: Math.round(scrollRatio * 100),
    minutesLeft: Math.max(1, Math.round(readingMinutes * (1 - scrollRatio))),
  };
}

function findRegionBySlug(areas: Map<string, Node[]>, slug: string): Node | null {
  for (const regions of areas.values()) {
    const found = regions.find((r) => r.slug === slug);
    if (found) return found;
  }
  return null;
}

export async function getLibraryBrowseData(options: {
  includeUnpublished: boolean;
  area?: string;
  region?: string;
  type?: DiseasePageType;
  userId?: string;
  sort?: LibrarySort;
  hideRead?: boolean;
}): Promise<LibraryBrowseData> {
  const sort: LibrarySort = options.sort ?? "reading_order";
  const hideRead = options.hideRead ?? false;
  const roots = await getLibraryForest(options.includeUnpublished);
  const areasByName = groupRootsByArea(roots);

  const totalPages = [...areasByName.values()]
    .flat()
    .reduce((sum, region) => sum + countDescendantPages(region), 0);

  // Only areas that actually have at least one page appear as a tab
  // at all (design spec's "hide, don't fake" rule, extended per
  // founder request to the tabs themselves, not just the Hero chips).
  const areas: LibraryAreaSummary[] = AREA_ORDER.map((name) => ({
    key: name,
    label: name,
    count: (areasByName.get(name) ?? []).reduce((sum, r) => sum + countDescendantPages(r), 0),
    color: AREA_COLOR[name] ?? null,
  })).filter((a) => a.count > 0);

  if (totalPages > 0) {
    areas.unshift({ key: "all", label: "All", count: totalPages, color: null });
  }

  // Default MSK if it has content, else the first area that does.
  const requestedArea = options.area && areas.some((a) => a.key === options.area) ? options.area : null;
  const activeArea =
    requestedArea ?? (areas.find((a) => a.key === "MSK") ?? areas[0])?.key ?? null;

  const regionNodes: Node[] =
    activeArea === "all"
      ? [...areasByName.values()].flat()
      : activeArea
        ? (areasByName.get(activeArea) ?? [])
        : [];

  const regions: LibraryRegionSummary[] = regionNodes.map((r) => ({
    slug: r.slug,
    name: r.name,
    count: countDescendantPages(r),
  }));

  // Default Spine within MSK (spec's "first visit: MSK › Spine"); more
  // generally, the first region with pages, falling back to the first
  // region at all so an area with only empty regions still has one
  // selected rather than none.
  const requestedRegion = regions.find((r) => r.slug === options.region) ?? null;
  const activeRegionSummary: LibraryRegionSummary | null =
    requestedRegion ??
    regions.find((r) => r.slug === "spine" && r.count > 0) ??
    regions.find((r) => r.count > 0) ??
    regions[0] ??
    null;

  const activeRegionNode = activeRegionSummary ? findRegionBySlug(areasByName, activeRegionSummary.slug) : null;

  const folders: LibraryFolderGroup[] = [];
  const loosePages: LibraryPageRow[] = [];

  if (activeRegionNode) {
    const allPageEntries = [
      ...activeRegionNode.children.flatMap((folder) => folder.pages.map((p) => ({ folder, p }))),
      ...activeRegionNode.pages.map((p) => ({ folder: null as Node | null, p })),
    ];
    const pageIds = allPageEntries.map((e) => e.p.id);
    const [minutesByDiseaseId, scrollRatioByDiseaseId] = await Promise.all([
      fetchReadingMinutes(pageIds),
      fetchProgressByDiseaseId(options.userId, pageIds),
    ]);
    const typeFilter = options.type;

    const buildRow = (p: LibraryTreePage): LibraryPageRow => {
      const readingMinutes = minutesByDiseaseId.get(p.id) ?? 1;
      return {
        slug: p.slug,
        title: p.name,
        type: p.type,
        readingMinutes,
        progress: toPageProgress(scrollRatioByDiseaseId.get(p.id), readingMinutes),
        contentTag: computeContentTag(p.publishedAt, p.reviewedAt),
      };
    };
    // "Hide read" only ever hides — with no userId (signed out) every
    // page reads "unread" already, so this filter is a no-op rather
    // than something that needs its own signed-out branch.
    const keepRow = (row: LibraryPageRow) => !hideRead || row.progress.state !== "read";
    // "shortest" needs each page's computed reading minutes, so it
    // sorts the built rows; every other mode sorts the tree pages
    // first (sortTreePages), before readingMinutes even exists.
    const applyShortestSort = (rows: LibraryPageRow[]) =>
      sort === "shortest" ? [...rows].sort((a, b) => a.readingMinutes - b.readingMinutes) : rows;

    for (const folder of activeRegionNode.children) {
      const pages = applyShortestSort(
        sortTreePages(folder.pages, sort)
          .filter((p) => !typeFilter || p.type === typeFilter)
          .map(buildRow)
          .filter(keepRow)
      );
      if (pages.length === 0) continue;
      folders.push({ name: folder.name, pages });
    }
    const looseRows = applyShortestSort(
      sortTreePages(activeRegionNode.pages, sort)
        .filter((p) => !typeFilter || p.type === typeFilter)
        .map(buildRow)
        .filter(keepRow)
    );
    loosePages.push(...looseRows);
  }

  const typeChips = await fetchTypeChips(options.includeUnpublished);

  return {
    totalPages,
    areas,
    activeArea,
    regions,
    activeRegion: activeRegionSummary?.slug ?? null,
    activeRegionName: activeRegionSummary?.name ?? null,
    folders,
    loosePages,
    typeChips,
    activeType: options.type ?? null,
    sort,
    hideRead,
  };
}

// Every page directly under a region node, or one of its folders —
// used both to find "this disease's region siblings" (thumbnail
// fallback) and, via countDescendantPages, region totals.
export function flattenPages(nodes: LibraryTreeNode[]): LibraryTreePage[] {
  return nodes.flatMap((n) => [...n.pages, ...flattenPages(n.children)]);
}

export function findRegionContaining(roots: LibraryTreeNode[], diseaseId: string): LibraryTreeNode | null {
  for (const region of roots) {
    if (flattenPages([region]).some((p) => p.id === diseaseId)) return region;
  }
  return null;
}

export interface LibraryThumbnail {
  assetUrl: string | null;
  alt: string;
}

// "The page's diagram, then the region's, then a plain tint" (design/
// LIBRARY-HOME-MIX-SPEC.md, Pass 3) — never stock photography, so the
// chain only ever pulls from real authored content: this disease's
// own linked illustration, or (if it has none) any illustration
// already used by a sibling page in the same region. `assetUrl: null`
// tells the caller to render the plain tint instead of an <img>.
export async function resolveThumbnail(
  diseaseId: string,
  regionSiblingIds: string[]
): Promise<LibraryThumbnail> {
  const { rows: own } = await pool.query<{ asset_url: string; alt_text: string | null }>(
    `SELECT mi.asset_url, mi.alt_text FROM illustration_usage iu
     JOIN medical_illustration mi ON mi.id = iu.medical_illustration_id
     WHERE iu.target_type = 'disease' AND iu.target_id = $1 LIMIT 1`,
    [diseaseId]
  );
  if (own[0]) return { assetUrl: own[0].asset_url, alt: own[0].alt_text ?? "" };

  if (regionSiblingIds.length > 0) {
    const { rows: sibling } = await pool.query<{ asset_url: string; alt_text: string | null }>(
      `SELECT mi.asset_url, mi.alt_text FROM illustration_usage iu
       JOIN medical_illustration mi ON mi.id = iu.medical_illustration_id
       WHERE iu.target_type = 'disease' AND iu.target_id = ANY($1) LIMIT 1`,
      [regionSiblingIds]
    );
    if (sibling[0]) return { assetUrl: sibling[0].asset_url, alt: sibling[0].alt_text ?? "" };
  }

  return { assetUrl: null, alt: "" };
}

export interface TopicOfWeekFeature {
  diseaseId: string;
  slug: string;
  title: string;
  pitch: string;
  regionName: string | null;
  readingMinutes: number;
  reviewedAt: Date | null;
  isFavorited: boolean;
  thumbnail: LibraryThumbnail;
}

// Null when nothing is flagged, the flagged page isn't visible to
// this viewer, or it has no pitch yet — an editor turning the toggle
// on before writing a pitch shouldn't put a half-empty panel in front
// of every reader ("hide, don't fake").
export async function getTopicOfWeek(options: {
  includeUnpublished: boolean;
  userId?: string;
}): Promise<TopicOfWeekFeature | null> {
  const { rows } = await pool.query<{
    id: string;
    slug: string;
    canonical_name: string;
    topic_of_week_pitch: string | null;
    reviewed_at: string | null;
  }>(
    `SELECT id, slug, canonical_name, topic_of_week_pitch, reviewed_at FROM disease
     WHERE is_topic_of_week = true ${options.includeUnpublished ? "" : "AND status = 'published'"}
     LIMIT 1`
  );
  const row = rows[0];
  if (!row || !row.topic_of_week_pitch?.trim()) return null;

  const [breadcrumb, { rows: blockRows }, roots, isFavorited] = await Promise.all([
    getBreadcrumbPath(row.slug),
    pool.query<{ content_config: Record<string, unknown> }>(
      `SELECT content_config FROM editorial_block WHERE disease_id = $1`,
      [row.id]
    ),
    getLibraryForest(options.includeUnpublished),
    options.userId ? isDiseaseFavorited(options.userId, row.id) : Promise.resolve(false),
  ]);

  const region = findRegionContaining(roots, row.id);
  const siblingIds = region ? flattenPages([region]).map((p) => p.id).filter((id) => id !== row.id) : [];
  const thumbnail = await resolveThumbnail(row.id, siblingIds);

  return {
    diseaseId: row.id,
    slug: row.slug,
    title: row.canonical_name,
    pitch: row.topic_of_week_pitch,
    regionName: breadcrumb[0]?.name ?? null,
    readingMinutes: estimateReadingMinutesFromValues(blockRows.map((r) => r.content_config)),
    reviewedAt: row.reviewed_at ? new Date(row.reviewed_at) : null,
    isFavorited,
    thumbnail,
  };
}
