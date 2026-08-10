"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronRight, Search } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import type { SectionIndex } from "@/lib/disease-loader";
import { onSectionIndexChanged } from "@/lib/section-events";
import { cardIcons } from "@/components/ui/cardIcons";
import { topicIcons } from "@/components/ui/topicIcons";
import {
  CARD_COLOR_CHIP,
  CARD_COLOR_TINT,
  CARD_COLOR_TEXT,
  DEFAULT_BRANCH_CYCLE,
} from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

interface IndexSidebarProps {
  tree: TopicNode[];
  // Only set by the mobile drawer, to close itself when a disease link
  // is picked — the desktop sidebar has no overlay to dismiss, so this
  // stays undefined there and every call site below already guards it.
  onNavigate?: () => void;
}

function nodeContainsSlug(node: TopicNode, diseaseSlug: string): boolean {
  if (node.diseases.some((d) => d.slug === diseaseSlug)) return true;
  return node.children.some((child) => nodeContainsSlug(child, diseaseSlug));
}

function matchesFilter(node: TopicNode, query: string): boolean {
  if (node.name.toLowerCase().includes(query)) return true;
  if (node.diseases.some((d) => d.canonicalName.toLowerCase().includes(query))) return true;
  return node.children.some((child) => matchesFilter(child, query));
}

// The Explore sidebar's tree browser — search-filter + recursive
// nodes. Doesn't own the sidebar's collapse state (that's Sidebar.tsx,
// which wraps the whole aside, not just this tree). `activeDiseaseSlug`
// is read from the URL itself (usePathname) rather than a prop, since
// this renders on every page, not just disease pages, so it can't
// receive "which disease is open" from a common ancestor.
export function IndexSidebar({ tree, onNavigate }: IndexSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const activeDiseaseSlug = pathname.startsWith("/conditions/") ? pathname.split("/")[2] : undefined;
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  // Fetched on demand for whichever disease page is actually open —
  // was a single hardcoded slug pre-fetched server-side alongside the
  // topic tree (entry #118); generalized (entry #125) so every
  // disease gets its section list nested in the tree, not just one
  // trial page, without turning every sidebar render (every page on
  // the site) into an N-disease fetch. `ignore` guards against a fast
  // nav — a slower in-flight fetch for the *previous* slug resolving
  // after a newer one has already started.
  const [sectionIndex, setSectionIndex] = useState<SectionIndex | null>(null);
  useEffect(() => {
    let ignore = false;
    function load() {
      const result = activeDiseaseSlug
        ? fetch(`/api/disease-sections/${activeDiseaseSlug}`)
            .then((res) => res.json())
            .then((data: { sectionIndex: SectionIndex | null }) => data.sectionIndex)
            .catch(() => null)
        : Promise.resolve(null);
      result.then((value) => {
        if (!ignore) setSectionIndex(value);
      });
    }
    load();
    // Refetch whenever an editor renames/adds/removes/reorders a
    // section on the currently open disease page — the slug itself
    // doesn't change on any of those edits, so this effect's own
    // dependency wouldn't otherwise re-run (see section-events.ts).
    const unsubscribe = onSectionIndexChanged(load);
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [activeDiseaseSlug]);

  // Scroll-spy for the active disease's section list — only wires up
  // a scroll listener while `sectionIndex` has actually resolved for
  // the current page, so this is a no-op cost on every other route.
  // Plain scroll-position check (last heading whose top has crossed
  // the threshold), same style as BackToTop's own `window.scrollY`
  // listener, rather than IntersectionObserver — one extra mechanism
  // to reason about isn't worth it for a handful of elements.
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  useEffect(() => {
    const ids =
      sectionIndex && activeDiseaseSlug === sectionIndex.diseaseSlug
        ? sectionIndex.sections.map((section) => section.id)
        : [];
    function handleScroll() {
      const threshold = 120;
      let current: string | null = null;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= threshold) {
          current = id;
        }
      }
      setActiveSectionId(current);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionIndex, activeDiseaseSlug]);

  // A separator carries no content of its own to match against, and
  // hiding everything around it while searching would leave it
  // floating with nothing underneath — simplest is to drop separators
  // from the filtered view entirely and only show them while browsing
  // the full tree.
  const visible = normalizedQuery
    ? tree.filter((node) => node.kind === "topic" && matchesFilter(node, normalizedQuery))
    : tree;
  // Separators don't consume a slot in the root color-cycling order —
  // otherwise dropping one in between root topics would shift which
  // cycled color every topic after it inherits, purely as a side
  // effect of where an admin placed a label (getDiseaseBranchColor in
  // topics.ts applies the same exclusion).
  let topicIndex = 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="relative shrink-0">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-secondary"
          aria-hidden="true"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search")}
          className="w-full rounded-lg border border-border bg-surface py-1.5 pr-2 pl-8 font-ui text-xs text-primary outline-none placeholder:text-secondary focus:border-accent"
        />
      </div>

      <div className="flex items-center justify-between px-1">
        <span className="font-ui text-[11px] font-medium tracking-wide text-secondary uppercase">
          {t("explore")}
        </span>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto">
        {visible.length === 0 ? (
          <p className="px-2 py-4 text-center font-ui text-xs text-secondary">{t("noMatchingTopics")}</p>
        ) : (
          visible.map((node, index) => {
            const inheritedColor = DEFAULT_BRANCH_CYCLE[topicIndex % DEFAULT_BRANCH_CYCLE.length];
            if (node.kind === "topic") topicIndex++;
            return (
              <TopicTreeItem
                key={node.id}
                node={node}
                depth={0}
                isFirst={index === 0}
                inheritedColor={inheritedColor}
                activeDiseaseSlug={activeDiseaseSlug}
                sectionIndex={sectionIndex}
                activeSectionId={activeSectionId}
                query={normalizedQuery}
                onNavigate={onNavigate}
              />
            );
          })
        )}
      </nav>
    </div>
  );
}

function TopicTreeItem({
  node,
  depth,
  isFirst,
  inheritedColor,
  activeDiseaseSlug,
  sectionIndex,
  activeSectionId,
  query,
  onNavigate,
}: {
  node: TopicNode;
  depth: number;
  isFirst?: boolean;
  inheritedColor: CardColor;
  activeDiseaseSlug?: string;
  sectionIndex: SectionIndex | null;
  activeSectionId: string | null;
  query: string;
  onNavigate?: () => void;
}) {
  // Hooks must run unconditionally on every render (rules-of-hooks) —
  // this state is meaningless for a separator (nothing below ever
  // reads `open` on that path, since the early return below skips
  // straight to the plain-label markup), but the call itself has to
  // stay above any early return regardless of which node kind this is.
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);

  // A plain section break (e.g. "MSK" above the extremity topics) —
  // not a topic at all: no button, no expand/collapse, nothing to
  // click. Bails out before any of the active/color/open logic below,
  // none of which applies to a label with no content of its own.
  if (node.kind === "separator") {
    return (
      <div className={`px-2 ${isFirst ? "" : "mt-3 border-t border-border/60 pt-3"}`}>
        <span className="font-ui text-[10px] font-semibold tracking-wide text-secondary/70 uppercase">
          {node.name}
        </span>
      </div>
    );
  }

  // This node's own color if the admin topic editor set one, else keep
  // carrying whatever the nearest colored ancestor passed down — a
  // whole branch reads as one color by default, but any node can break
  // from that and start a new color for everything under it.
  const color = node.color ?? inheritedColor;
  const containsActive = activeDiseaseSlug ? nodeContainsSlug(node, activeDiseaseSlug) : false;
  // The immediate parent of the active disease — not every ancestor —
  // gets the branch-color background wash, same "current section"
  // emphasis the reference screenshot used (only the disease's direct
  // parent topic was tinted; topics further up just went bold).
  const isActiveParent = activeDiseaseSlug
    ? node.diseases.some((d) => d.slug === activeDiseaseSlug)
    : false;
  // While a search query is active, open state is purely derived from
  // whether this node's subtree matches — always accurate to what's
  // currently typed, and lets a manual collapse from before searching
  // not get "stuck" hiding a real match. Once the query clears, falls
  // back to the user's own last toggle, defaulting to the branch that
  // contains the currently-open disease (auto-expanded on first load).
  const open = query ? matchesFilter(node, query) : (manualOpen ?? containsActive);

  const hasChildren = node.children.length > 0 || node.diseases.length > 0;
  // Only the first two tree levels get a colored icon chip (own DB
  // icon if set — today only top-level topics have one — else a
  // generic "book" chip in the branch color); depth 2+ (e.g.
  // Tendinopathies under Foot & Ankle) always falls through to the
  // plain dot bullet below, same as the disease links — founder
  // request, so icons mark "browsing categories," not every node that
  // merely happens to have children.
  const Icon = depth < 2 ? (node.icon ? topicIcons[node.icon] : hasChildren ? cardIcons["book-open"] : null) : null;

  return (
    <div>
      <button
        type="button"
        onClick={() => hasChildren && setManualOpen((current) => !(current ?? containsActive))}
        disabled={!hasChildren}
        className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left font-ui text-xs transition-colors duration-base ${
          isActiveParent
            ? `${CARD_COLOR_TINT[color]} font-medium text-primary`
            : containsActive
              ? "font-medium text-secondary hover:bg-border/40"
              : "text-secondary hover:bg-border/40"
        }`}
        style={{ paddingLeft: `${6 + depth * 12}px` }}
      >
        {Icon ? (
          <span className={`flex size-5 shrink-0 items-center justify-center rounded ${CARD_COLOR_CHIP[color]}`}>
            <Icon className="size-3" aria-hidden="true" />
          </span>
        ) : (
          <span className="size-1 shrink-0 rounded-full bg-secondary/50" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
        {hasChildren && (
          <ChevronRight
            className={`size-3 shrink-0 text-secondary transition-transform duration-base ${
              open ? "rotate-90" : ""
            }`}
            aria-hidden="true"
          />
        )}
      </button>

      {open && hasChildren && (
        <div className="flex flex-col">
          {node.children.map((child) => (
            <TopicTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              inheritedColor={color}
              activeDiseaseSlug={activeDiseaseSlug}
              sectionIndex={sectionIndex}
              activeSectionId={activeSectionId}
              query={query}
              onNavigate={onNavigate}
            />
          ))}
          {node.diseases.map((disease) => {
            const active = activeDiseaseSlug === disease.slug;
            const diseaseSections =
              sectionIndex?.diseaseSlug === disease.slug ? sectionIndex.sections : null;
            return (
              <div key={disease.slug}>
                <Link
                  href={`/conditions/${disease.slug}`}
                  onClick={onNavigate}
                  className={`flex items-center gap-1.5 py-1 pr-2 font-ui text-xs transition-colors duration-base hover:bg-border/40 ${
                    active ? `${CARD_COLOR_TEXT[color]} font-medium` : "text-secondary hover:text-primary"
                  }`}
                  style={{ paddingLeft: `${6 + (depth + 1) * 12}px` }}
                >
                  <span className="size-1 shrink-0 rounded-full bg-current" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{disease.canonicalName}</span>
                </Link>
                {/* Generalized to every disease in entry #125 — only
                    non-null once the client fetch above resolves for
                    whichever disease is currently open, so every other
                    disease link renders exactly as before with no
                    extra query on its behalf. */}
                {diseaseSections && (
                  <div className="flex flex-col">
                    {diseaseSections.map((section) => {
                      const sectionActive = activeSectionId === section.id;
                      return (
                        <Link
                          key={section.id}
                          href={`/conditions/${disease.slug}#${section.id}`}
                          onClick={onNavigate}
                          className={`flex items-center gap-1.5 py-1 pr-2 font-ui text-[11px] transition-colors duration-base hover:bg-border/40 ${
                            sectionActive
                              ? `font-bold ${CARD_COLOR_TEXT[color]}`
                              : "text-secondary hover:text-primary"
                          }`}
                          style={{ paddingLeft: `${6 + (depth + 2) * 12}px` }}
                        >
                          <span
                            className={`size-1 shrink-0 rounded-full ${
                              sectionActive ? "bg-current" : "bg-secondary/30"
                            }`}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate">{section.heading}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
