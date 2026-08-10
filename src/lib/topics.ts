import { pool } from "@/lib/db";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { medicalIcons, type MedicalIconName } from "@/components/ui/medicalIcons";
import { anatomyIcons, type AnatomyIconName } from "@/components/ui/anatomyIcons";
import { CARD_COLOR_ORDER, DEFAULT_BRANCH_CYCLE } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

export type TopicIconName = CardIconName | MedicalIconName | AnatomyIconName;

// The Index sidebar's data layer — a real, persisted tree (migration
// 0021), not the old derived-per-request "regions" concept. Small
// enough (dozens of topics, a handful of diseases) that every function
// here just fetches the whole flat table and assembles/walks it in
// JS — simpler and cheaper than recursive CTEs at this size.

export interface TopicDisease {
  slug: string;
  canonicalName: string;
}

// "separator" is a plain, non-navigable label an admin can drop
// between root topics (e.g. "MSK" above the extremity topics,
// "Neurology" above the cranial-nerve ones) — a section break, not a
// grouping node: it never has children or diseases attached (nothing
// in this codebase creates either for a separator), so every existing
// tree-walk here (breadcrumbs, adjacent-disease flattening, the
// catalog topic filter) already ignores it for free — those all key
// off `disease.topic_id` / `parent_id` chains a separator never
// participates in on either side.
export type TopicKind = "topic" | "separator";

export interface TopicNode {
  id: string;
  slug: string;
  name: string;
  kind: TopicKind;
  icon: TopicIconName | null;
  color: CardColor | null;
  children: TopicNode[];
  diseases: TopicDisease[];
}

interface TopicRow {
  id: string;
  slug: string;
  name: string;
  parent_id: string | null;
  position: number;
  icon: string | null;
  color: string | null;
  kind: string;
}

interface DiseaseRow {
  slug: string;
  canonical_name: string;
  topic_id: string;
}

function isTopicIconName(value: string | null): value is TopicIconName {
  return !!value && (value in cardIcons || value in medicalIcons || value in anatomyIcons);
}

function isCardColor(value: string | null): value is CardColor {
  return !!value && (CARD_COLOR_ORDER as string[]).includes(value);
}

function isTopicKind(value: string): value is TopicKind {
  return value === "topic" || value === "separator";
}

async function fetchTopicRows(): Promise<TopicRow[]> {
  const { rows } = await pool.query(
    `SELECT id, slug, name, parent_id, position, icon, color, kind FROM topic ORDER BY position, name`
  );
  return rows;
}

// `includeUnpublished` mirrors the same editor/admin visibility check
// the disease page itself already applies — a signed-out visitor or
// member should never see a draft disease's title leak into the
// sidebar/breadcrumbs/prev-next, even though the page itself is
// separately gated too (defense in depth, not the only check).
async function fetchDiseaseRows(includeUnpublished: boolean): Promise<DiseaseRow[]> {
  const { rows } = await pool.query(
    `SELECT slug, canonical_name, topic_id FROM disease
     WHERE topic_id IS NOT NULL ${includeUnpublished ? "" : "AND status = 'published'"}
     ORDER BY canonical_name`
  );
  return rows;
}

function buildTree(topicRows: TopicRow[], diseaseRows: DiseaseRow[]): TopicNode[] {
  const nodesById = new Map<string, TopicNode>();
  for (const row of topicRows) {
    nodesById.set(row.id, {
      id: row.id,
      slug: row.slug,
      name: row.name,
      kind: isTopicKind(row.kind) ? row.kind : "topic",
      icon: isTopicIconName(row.icon) ? row.icon : null,
      color: isCardColor(row.color) ? row.color : null,
      children: [],
      diseases: [],
    });
  }

  for (const row of diseaseRows) {
    nodesById.get(row.topic_id)?.diseases.push({ slug: row.slug, canonicalName: row.canonical_name });
  }

  const roots: TopicNode[] = [];
  for (const row of topicRows) {
    const node = nodesById.get(row.id)!;
    if (row.parent_id) {
      nodesById.get(row.parent_id)?.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export async function getTopicTree(includeUnpublished = false): Promise<TopicNode[]> {
  const [topicRows, diseaseRows] = await Promise.all([
    fetchTopicRows(),
    fetchDiseaseRows(includeUnpublished),
  ]);
  return buildTree(topicRows, diseaseRows);
}

export interface BreadcrumbTopic {
  slug: string;
  name: string;
}

// Root-first order — [Region, System, ...] — the disease's own name
// is deliberately not included here (it's already the page's H1); the
// crumb trail stops at the disease's immediate parent topic.
export async function getBreadcrumbPath(diseaseSlug: string): Promise<BreadcrumbTopic[]> {
  const { rows } = await pool.query(
    `SELECT topic_id FROM disease WHERE slug = $1`,
    [diseaseSlug]
  );
  const topicId = rows[0]?.topic_id as string | undefined;
  if (!topicId) return [];

  const topicRows = await fetchTopicRows();
  const byId = new Map(topicRows.map((r) => [r.id, r]));

  const path: BreadcrumbTopic[] = [];
  let current: TopicRow | undefined = byId.get(topicId);
  while (current) {
    path.unshift({ slug: current.slug, name: current.name });
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return path;
}

// Resolves the exact color IndexSidebar.tsx would tint this disease's
// immediate parent topic with — the "current section" background
// wash a signed-in editor sees highlighted in the Explore tree while
// this disease's page is open. Same resolution rule as
// TopicTreeItem's own `color = node.color ?? inheritedColor`, walked
// root-to-leaf by hand here rather than building the whole tree, since
// only one path through it is actually needed. Returns null if the
// disease has no topic (shouldn't happen for a real disease row, but
// keeps this a non-throwing lookup for callers).
export async function getDiseaseBranchColor(diseaseSlug: string): Promise<CardColor | null> {
  const { rows } = await pool.query(
    `SELECT topic_id FROM disease WHERE slug = $1`,
    [diseaseSlug]
  );
  const topicId = rows[0]?.topic_id as string | undefined;
  if (!topicId) return null;

  const topicRows = await fetchTopicRows();
  const byId = new Map(topicRows.map((r) => [r.id, r]));

  const path: TopicRow[] = [];
  let current: TopicRow | undefined = byId.get(topicId);
  while (current) {
    path.unshift(current);
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  if (path.length === 0) return null;

  // Separators are excluded here, not just "topics with no color" —
  // otherwise inserting one between two root topics would shift the
  // cycled color every real topic after it inherits, purely as a side
  // effect of where an admin dropped a label.
  const roots = topicRows.filter((r) => !r.parent_id && r.kind === "topic");
  const rootIndex = Math.max(
    0,
    roots.findIndex((r) => r.id === path[0].id)
  );
  let color: CardColor = DEFAULT_BRANCH_CYCLE[rootIndex % DEFAULT_BRANCH_CYCLE.length];
  for (const topic of path) {
    if (isCardColor(topic.color)) color = topic.color;
  }
  return color;
}

// Depth-first flatten of the whole tree (topics in `position` order,
// diseases within a leaf topic in `canonical_name` order) — Previous/
// Next read like turning pages in a book, crossing topic boundaries
// seamlessly, not confined to one category.
function flattenDiseases(nodes: TopicNode[]): TopicDisease[] {
  const out: TopicDisease[] = [];
  for (const node of nodes) {
    out.push(...node.diseases);
    out.push(...flattenDiseases(node.children));
  }
  return out;
}

export interface AdjacentDiseases {
  previous: TopicDisease | null;
  next: TopicDisease | null;
}

export async function getAdjacentDiseases(
  diseaseSlug: string,
  includeUnpublished = false
): Promise<AdjacentDiseases> {
  const tree = await getTopicTree(includeUnpublished);
  const flat = flattenDiseases(tree);
  const index = flat.findIndex((d) => d.slug === diseaseSlug);
  if (index === -1) return { previous: null, next: null };
  return {
    previous: index > 0 ? flat[index - 1] : null,
    next: index < flat.length - 1 ? flat[index + 1] : null,
  };
}

function descendantIdsOf(root: TopicRow, topicRows: TopicRow[]): string[] {
  const childrenByParent = new Map<string, TopicRow[]>();
  for (const row of topicRows) {
    if (!row.parent_id) continue;
    const list = childrenByParent.get(row.parent_id) ?? [];
    list.push(row);
    childrenByParent.set(row.parent_id, list);
  }

  const ids: string[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    ids.push(node.id);
    stack.push(...(childrenByParent.get(node.id) ?? []));
  }
  return ids;
}

// For the admin topic editor's drag-and-drop re-parenting — a topic
// can never be dropped onto itself or one of its own descendants
// (that would orphan the whole subtree from the root). Returns ids
// only, including `topicId` itself.
export async function getDescendantIds(topicId: string): Promise<string[]> {
  const topicRows = await fetchTopicRows();
  const root = topicRows.find((r) => r.id === topicId);
  if (!root) return [];
  return descendantIdsOf(root, topicRows);
}

// For the catalog page's `?topic=` filter — a topic slug plus every
// descendant topic's id, so filtering by "Lower Extremity" correctly
// includes diseases attached several levels down (e.g. under Foot &
// Ankle > Tendinopathies), not just diseases attached directly to the
// clicked node.
export async function getTopicAndDescendantIds(topicSlug: string): Promise<string[]> {
  const topicRows = await fetchTopicRows();
  const root = topicRows.find((r) => r.slug === topicSlug);
  if (!root) return [];
  const ids = descendantIdsOf(root, topicRows);
  return ids;
}

export interface TopicFilter {
  name: string;
  diseaseSlugs: Set<string>;
}

// The catalog page's `?topic=` filter, resolved in one call — the
// clicked topic's own display name (for the page heading) plus every
// disease slug attached anywhere under it. Returns null for an unknown
// slug so the caller can fall back to showing the unfiltered catalog
// rather than an empty page.
export async function getTopicFilter(topicSlug: string): Promise<TopicFilter | null> {
  const topicRows = await fetchTopicRows();
  const root = topicRows.find((r) => r.slug === topicSlug);
  if (!root) return null;

  const ids = new Set(await getTopicAndDescendantIds(topicSlug));
  const { rows } = await pool.query(
    `SELECT slug FROM disease WHERE topic_id = ANY($1::uuid[])`,
    [[...ids]]
  );
  return { name: root.name, diseaseSlugs: new Set(rows.map((r) => r.slug as string)) };
}
