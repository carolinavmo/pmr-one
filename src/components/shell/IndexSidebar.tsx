"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Search } from "lucide-react";
import type { TopicIconName, TopicNode } from "@/lib/topics";
import type { SectionIndex, SectionIndexEntry } from "@/lib/disease-loader";
import { onSectionIndexChanged } from "@/lib/section-events";
import { topicIcons } from "@/components/ui/topicIcons";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";
import { saveReadingProgressAction } from "@/lib/actions/workspace";
import type { ReadingProgress } from "@/lib/workspace";

// LIBRARY-FINAL-SPEC.md — browsing is a straight-line tree that NEVER
// leaves the sidebar. Opening a page rises a dock from the bottom,
// with three snap heights (peek/half/full) the reader drags between;
// the tree stays usable above it at half, collapses to a slim
// "Show the library" strip at full, and the dock itself tucks to a
// slim navy peek bar. There is no "back" — the library is always at
// worst one strip away. This replaces the earlier navy-band design
// entirely (band, chevron-back, tree-scroll-restore) — see this
// file's git history; the spec itself reverted that direction.
//
// Data-model note (same reinterpretation as every pass this session):
// separators ("MSK", "Basic Sciences", "Neurology") are Subjects; the
// root topics after one are its Regions; a region's own child topics
// are Folders; a folder's diseases are Pages. Folders are NOT a
// distinct DB kind (topic.kind is only "topic" | "separator") — a
// folder is inferred purely from being one level deeper than a
// region.

interface IndexSidebarProps {
  tree: TopicNode[];
  isSignedIn: boolean;
  onNavigate?: () => void;
  // The desktop rail's collapse toggle — rendered inline in the search
  // row instead of its own header strip (SidebarFrame.tsx used to give
  // it a dedicated bordered row above the search field, which read as
  // dead space). Omitted entirely for the mobile drawer, which has its
  // own close "X" in its own header for the same job.
  headerAction?: ReactNode;
}

interface RailPage {
  id: string;
  slug: string;
  canonicalName: string;
}

interface RailFolder {
  id: string;
  name: string;
  icon: TopicIconName | null;
  color: CardColor | null;
  pages: RailPage[];
}

interface RailRegion {
  id: string;
  name: string;
  icon: TopicIconName | null;
  color: CardColor | null;
  folders: RailFolder[];
  loosePages: RailPage[];
}

interface RailSubject {
  id: string;
  name: string;
  regions: RailRegion[];
}

function buildSubjects(tree: TopicNode[]): RailSubject[] {
  const subjects: RailSubject[] = [];
  let i = 0;
  while (i < tree.length) {
    const node = tree[i];
    if (node.kind !== "separator") {
      i++;
      continue;
    }
    const separator = node;
    i++;
    const regionNodes: TopicNode[] = [];
    while (i < tree.length && tree[i].kind !== "separator") {
      regionNodes.push(tree[i]);
      i++;
    }
    subjects.push({
      id: separator.id,
      name: separator.name,
      regions: regionNodes.map((regionNode) => ({
        id: regionNode.id,
        name: regionNode.name,
        icon: regionNode.icon,
        color: regionNode.color,
        folders: regionNode.children.map((folderNode) => ({
          id: folderNode.id,
          name: folderNode.name,
          icon: folderNode.icon,
          color: folderNode.color,
          pages: folderNode.diseases,
        })),
        loosePages: regionNode.diseases,
      })),
    });
  }
  return subjects;
}

interface DiseasePath {
  subject: RailSubject;
  region: RailRegion;
  folder: RailFolder | null;
  page: RailPage;
}

function findDiseasePath(subjects: RailSubject[], slug: string | undefined): DiseasePath | null {
  if (!slug) return null;
  for (const subject of subjects) {
    for (const region of subject.regions) {
      for (const folder of region.folders) {
        const page = folder.pages.find((p) => p.slug === slug);
        if (page) return { subject, region, folder, page };
      }
      const loosePage = region.loosePages.find((p) => p.slug === slug);
      if (loosePage) return { subject, region, folder: null, page: loosePage };
    }
  }
  return null;
}

interface SearchHit {
  page: RailPage;
  pathLabel: string;
}

function searchPages(subjects: RailSubject[], query: string): SearchHit[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const hits: SearchHit[] = [];
  for (const subject of subjects) {
    for (const region of subject.regions) {
      for (const folder of region.folders) {
        for (const page of folder.pages) {
          if (page.canonicalName.toLowerCase().includes(normalized)) {
            hits.push({ page, pathLabel: `${subject.name} · ${region.name} · ${folder.name}` });
          }
        }
      }
      for (const page of region.loosePages) {
        if (page.canonicalName.toLowerCase().includes(normalized)) {
          hits.push({ page, pathLabel: `${subject.name} · ${region.name}` });
        }
      }
    }
  }
  return hits;
}

function highlightMatch(text: string, query: string): ReactNode {
  const normalized = query.trim();
  if (!normalized) return text;
  const index = text.toLowerCase().indexOf(normalized.toLowerCase());
  if (index === -1) return text;
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[3px] bg-[#FFF2C4] px-px text-inherit">{text.slice(index, index + normalized.length)}</mark>
      {text.slice(index + normalized.length)}
    </>
  );
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const READING_PROGRESS_STORAGE_PREFIX = "pmr-atlas:reading-progress:";
const WORDS_PER_MINUTE = 200;

function loadLocalProgress(slug: string): ReadingProgress | null {
  try {
    const raw = localStorage.getItem(`${READING_PROGRESS_STORAGE_PREFIX}${slug}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocalProgress(slug: string, progress: ReadingProgress): void {
  try {
    localStorage.setItem(`${READING_PROGRESS_STORAGE_PREFIX}${slug}`, JSON.stringify(progress));
  } catch {
    // Private browsing / storage disabled — progress just doesn't persist, not worth surfacing.
  }
}

interface FolderAdjacent {
  previous: { slug: string; canonicalName: string } | null;
  next: { slug: string; canonicalName: string } | null;
}

// ---- Dock height preference (device-level, same convention as
// SidebarFrame.tsx's own collapsed-sidebar toggle: a module-level
// subscribe/snapshot store read through useSyncExternalStore so the
// very first client render already reflects it — no flash from a
// default value to the remembered one). ----------------------------
type DockMode = "peek" | "half" | "full";
const DOCK_MODE_STORAGE_KEY = "pmr-atlas:dock-mode";
const DOCK_ORDER: DockMode[] = ["peek", "half", "full"];
let dockModeListeners: (() => void)[] = [];

function subscribeDockMode(onChange: () => void) {
  dockModeListeners.push(onChange);
  return () => {
    dockModeListeners = dockModeListeners.filter((listener) => listener !== onChange);
  };
}
function getDockModeSnapshot(): DockMode {
  const raw = localStorage.getItem(DOCK_MODE_STORAGE_KEY);
  return raw === "peek" || raw === "half" || raw === "full" ? raw : "half";
}
function getDockModeServerSnapshot(): DockMode {
  return "half";
}
function setDockModeStorage(value: DockMode) {
  localStorage.setItem(DOCK_MODE_STORAGE_KEY, value);
  for (const listener of dockModeListeners) listener();
}

const PEEK_PX = 64;
const HALF_RATIO = 0.55;
const FULL_STRIP_PX = 40;

// ---- Tree row styling (LIBRARY-FINAL-SPEC.md §1) --------------------
const GROUP_LABEL_CLASS = "px-2 pt-2.5 pb-1 font-ui text-[9.5px] font-black tracking-[1.4px] text-[#9AA5B4] first:pt-0";
const TREE_ROW_CLASS =
  "flex w-full items-start gap-[9px] rounded-lg px-2 py-1.5 text-left font-ui text-[13px] font-bold leading-[1.3] text-primary transition-colors duration-base hover:bg-[#EAEEF3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-white";
const TREE_TILE_CLASS = "-mt-px flex size-[19px] shrink-0 items-center justify-center rounded-[6px]";
// Background/icon color kept out of TREE_TILE_CLASS and chosen one-or-
// the-other below (an admin-picked CardColor via CARD_COLOR_CHIP, or
// one of these defaults) — same reasoning as PAGE_ROW_CLASS: two
// same-property utilities present together race on generated CSS
// order, not JSX order.
const TREE_TILE_REGION_DEFAULT_CLASS = "bg-[#E7EBF4] text-[#6B7A99]";
const TREE_TILE_FOLDER_DEFAULT_CLASS = "border border-[#E6D2A8] bg-insight-bg text-[#A8760F]";
// Straight guide line, 1.5px, 21px indent step (17px margin + 4px
// padding) — only ever rendered for an open (on-your-path) branch, so
// it's always the accent colour; the spec's "#D0D7E1 elsewhere" describes
// the token's other use (the reading-progress line), not a second
// state this always-one-open-path tree ever shows.
const GUIDE_LINE_CLASS = "ml-[17px] border-l-[1.5px] border-navy pl-1";
const PAGE_ROW_CLASS =
  "flex items-start gap-[9px] rounded-lg px-2 py-1.5 font-ui text-[12.5px] leading-[1.3] transition-colors duration-base hover:bg-[#EAEEF3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 focus-visible:ring-offset-white";
// font-weight and text-color kept out of PAGE_ROW_CLASS and chosen
// one-or-the-other below, never both at once — two same-specificity
// utilities for the same property present together race on generated
// CSS order, not JSX order, so layering a base value under a
// conditional override is unreliable.
// Navy, not --acc — the tree's own accent (LIBRARY-FINAL-SPEC.md's
// open decision, resolved for the tree specifically: navy reads as
// "your path" without competing with the dock/peek bar's own navy
// chrome, which still needs a teal accent since navy-on-navy there
// would be invisible — that's why only the tree switched, not the
// whole --acc system).
const PAGE_ROW_CURRENT_CLASS = "bg-navy/[0.08] font-extrabold text-navy hover:bg-navy/[0.08]";
const PAGE_ROW_DEFAULT_CLASS = "font-semibold text-secondary";

export function IndexSidebar({ tree, isSignedIn, onNavigate, headerAction }: IndexSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const activeDiseaseSlug = pathname.startsWith("/conditions/") ? pathname.split("/")[2] : undefined;

  const subjects = useMemo(() => buildSubjects(tree), [tree]);
  const activePath = useMemo(() => findDiseasePath(subjects, activeDiseaseSlug), [subjects, activeDiseaseSlug]);

  const [openRegionId, setOpenRegionId] = useState<string | null>(() => activePath?.region.id ?? null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(() => activePath?.folder?.id ?? null);
  const [lastOpenedSlug, setLastOpenedSlug] = useState<string | undefined>(activeDiseaseSlug);
  const [query, setQuery] = useState("");

  const railRef = useRef<HTMLDivElement>(null);
  // The dock/peek/strip's own scroll container — separate from the
  // tree's, per "independent scroll" (Dock rules §3).
  const dockScrollRef = useRef<HTMLDivElement>(null);

  // Route sync: the tree always shows the branches for whichever page
  // is open (or was last open) — never resets forcibly to a "browse"
  // state, since the tree never leaves.
  useEffect(() => {
    if (activePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing rail state to a route change (activeDiseaseSlug, from usePathname) that already happened outside React's render; there's no render-time value this replaces.
      setOpenRegionId(activePath.region.id);
      setOpenFolderId(activePath.folder?.id ?? null);
      setLastOpenedSlug(activeDiseaseSlug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDiseaseSlug]);

  const [sectionIndex, setSectionIndex] = useState<SectionIndex | null>(null);
  useEffect(() => {
    let ignore = false;
    function load() {
      const result = activePath
        ? fetch(`/api/disease-sections/${activePath.page.slug}`)
            .then((res) => res.json())
            .then((data: { sectionIndex: SectionIndex | null }) => data.sectionIndex)
            .catch(() => null)
        : Promise.resolve(null);
      result.then((value) => {
        if (!ignore) setSectionIndex(value);
      });
    }
    load();
    const unsubscribe = onSectionIndexChanged(load);
    return () => {
      ignore = true;
      unsubscribe();
    };
  }, [activePath]);

  // "Next in this folder" — fetched once per page, not just at the end,
  // so it's ready the instant the reader reaches the last section.
  const [folderAdjacent, setFolderAdjacent] = useState<FolderAdjacent | null>(null);
  useEffect(() => {
    if (!activePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting to the "no active page" state on navigation (activePath, from usePathname), external to React; there's no render-time value this replaces.
      setFolderAdjacent(null);
      return;
    }
    let ignore = false;
    fetch(`/api/folder-adjacent/${activePath.page.slug}`)
      .then((res) => res.json())
      .then((data: { folderAdjacent: FolderAdjacent | null }) => {
        if (!ignore) setFolderAdjacent(data.folderAdjacent);
      })
      .catch(() => {
        if (!ignore) setFolderAdjacent(null);
      });
    return () => {
      ignore = true;
    };
  }, [activePath]);

  // ---- Reading-progress state --------------------------------------
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [currentSubsectionId, setCurrentSubsectionId] = useState<string | null>(null);
  const [readSectionIds, setReadSectionIds] = useState<Set<string>>(new Set());
  const [scrollRatio, setScrollRatio] = useState(0);
  const [timeLabel, setTimeLabel] = useState("");

  const scrollRatioRef = useRef(0);
  const totalWordsRef = useRef(0);
  const progressReadyRef = useRef(false); // guards the very first render of a page from overwriting saved progress with a blank state
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  const flatSectionsRef = useRef<{ id: string; sectionId: string }[]>([]);
  // Sections the scroll-spy has actually observed as current at some
  // point — "passed by the reader" (below) only fires for these, never
  // for a section a fast scroll or a direct jump skipped over without
  // it ever being seen.
  const visitedSectionIdsRef = useRef<Set<string>>(new Set());

  function beginProgrammaticScroll() {
    isProgrammaticScrollRef.current = true;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      isProgrammaticScrollRef.current = false;
      window.removeEventListener("scrollend", finish);
      const threshold = 100;
      let found: { id: string; sectionId: string } | null = null;
      for (const entry of flatSectionsRef.current) {
        const el = document.getElementById(entry.id);
        if (el && el.getBoundingClientRect().top <= threshold) found = entry;
      }
      if (found) {
        setCurrentSectionId(found.sectionId);
        setCurrentSubsectionId(found.id !== found.sectionId ? found.id : null);
      }
    };
    window.addEventListener("scrollend", finish, { once: true });
    setTimeout(finish, 700);
  }

  function markSectionsRead(ids: string[]) {
    setReadSectionIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const id of ids) {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }

  useEffect(() => {
    progressReadyRef.current = false;
    visitedSectionIdsRef.current = new Set();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing rail state to a route change (activePath, derived from usePathname) that already happened outside React's render; there's no render-time value this replaces.
    setCurrentSectionId(null);
    setCurrentSubsectionId(null);
    setReadSectionIds(new Set());
    setTimeLabel("");
  }, [activePath?.page.slug]);

  useEffect(() => {
    if (!activePath) return;
    let ignore = false;
    async function load() {
      let saved: ReadingProgress | null = null;
      if (isSignedIn) {
        try {
          const res = await fetch(`/api/reading-progress/${activePath!.page.slug}`);
          const data = await res.json();
          saved = data.progress ?? null;
        } catch {
          saved = null;
        }
      } else {
        saved = loadLocalProgress(activePath!.page.slug);
      }
      if (ignore) return;
      if (saved) {
        setReadSectionIds(new Set(saved.readSectionIds));
        if (!window.location.hash && saved.lastSectionId) {
          const targetId = saved.lastSectionId;
          requestAnimationFrame(() => {
            document.getElementById(targetId)?.scrollIntoView({
              block: "start",
              behavior: prefersReducedMotion() ? "auto" : "smooth",
            });
          });
        }
      }
      progressReadyRef.current = true;
    }
    load();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deliberately keyed on the primitive slug, not the activePath object reference, which changes on every `subjects` rebuild even when the disease itself hasn't.
  }, [activePath?.page.slug, isSignedIn]);

  useEffect(() => {
    if (!sectionIndex || !activePath || sectionIndex.diseaseSlug !== activePath.page.slug) return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    for (const section of sectionIndex.sections) {
      if (section.id === hash) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizing from the URL hash, external to React; there's no render-time value this replaces.
        setCurrentSectionId(section.id);
        setCurrentSubsectionId(null);
        requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
        return;
      }
      const sub = section.subsections.find((s) => s.id === hash);
      if (sub) {
        setCurrentSectionId(section.id);
        setCurrentSubsectionId(sub.id);
        requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }));
        return;
      }
    }
  }, [sectionIndex, activePath]);

  useEffect(() => {
    if (!sectionIndex || !activePath || sectionIndex.diseaseSlug !== activePath.page.slug) return;
    const flat = sectionIndex.sections.flatMap((section) => [
      { id: section.id, sectionId: section.id },
      ...section.subsections.map((sub) => ({ id: sub.id, sectionId: section.id })),
    ]);
    const order = flat.map((entry) => entry.id);
    const intersecting = new Set<string>();
    flatSectionsRef.current = flat;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isProgrammaticScrollRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target.id);
          else intersecting.delete(entry.target.id);
        }
        const topmostId = order.find((id) => intersecting.has(id));
        if (!topmostId) return; // nothing intersects — keep the last known section, never clear to "none"
        const topmost = flat.find((entry) => entry.id === topmostId)!;
        setCurrentSectionId(topmost.sectionId);
        setCurrentSubsectionId(topmost.id !== topmost.sectionId ? topmost.id : null);
        visitedSectionIdsRef.current.add(topmost.sectionId);
      },
      { rootMargin: "-96px 0px -60% 0px", threshold: 0 }
    );
    for (const entry of flat) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sectionIndex, activePath]);

  useEffect(() => {
    if (!sectionIndex || !activePath || sectionIndex.diseaseSlug !== activePath.page.slug) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.intersectionRatio >= 0.5) {
            if (!timers.has(id)) {
              timers.set(
                id,
                setTimeout(() => {
                  timers.delete(id);
                  markSectionsRead([id]);
                }, 3000)
              );
            }
          } else {
            const timer = timers.get(id);
            if (timer) {
              clearTimeout(timer);
              timers.delete(id);
            }
          }
        }
      },
      { threshold: 0.5 }
    );
    for (const section of sectionIndex.sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }
    return () => {
      observer.disconnect();
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
    };
  }, [sectionIndex, activePath]);

  useEffect(() => {
    if (!sectionIndex || !currentSectionId) return;
    const ids = sectionIndex.sections.map((s) => s.id);
    const idx = ids.indexOf(currentSectionId);
    if (idx <= 0) return;
    // "Passed by the reader" — only for sections the scroll-spy actually
    // observed as current at some point. A fast scroll or a direct jump
    // (hash link, clicking a distant section) can leapfrog currentSectionId
    // straight past sections it never reported as intersecting; those
    // were never seen, so they don't count as passed.
    const passed = ids.slice(0, idx).filter((id) => visitedSectionIdsRef.current.has(id));
    if (passed.length > 0) markSectionsRead(passed);
  }, [currentSectionId, sectionIndex]);

  useEffect(() => {
    if (!activePath) return;
    let rafId: number | null = null;
    function computeRatio() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      return scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    }
    function commit() {
      const ratio = computeRatio();
      scrollRatioRef.current = ratio;
      setScrollRatio(ratio);
    }
    function onScroll() {
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        commit();
      });
    }
    commit();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [activePath]);

  useEffect(() => {
    if (!activePath) return;
    const main = document.querySelector("main");
    const text = main?.textContent ?? "";
    totalWordsRef.current = text.split(/\s+/).filter(Boolean).length;
  }, [activePath]);

  // "X min left" — recomputed only on section change (not every scroll
  // tick, to avoid a flickering countdown); the live percentage in the
  // caption comes from scrollRatio directly at render time instead.
  useEffect(() => {
    if (!activePath) return;
    const ratio = scrollRatioRef.current;
    const minutes = Math.max(0, Math.round((totalWordsRef.current * (1 - ratio)) / WORDS_PER_MINUTE));
    setTimeLabel(`${minutes} min left`);
  }, [currentSectionId, activePath]);

  useEffect(() => {
    if (!activePath || !progressReadyRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const progress: ReadingProgress = {
        readSectionIds: [...readSectionIds],
        lastSectionId: currentSectionId,
        scrollRatio: scrollRatioRef.current,
      };
      if (isSignedIn) {
        saveReadingProgressAction(activePath.page.id, progress).catch(() => {});
      } else {
        saveLocalProgress(activePath.page.slug, progress);
      }
    }, 2000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [readSectionIds, currentSectionId, scrollRatio, activePath, isSignedIn]);

  // Auto-scroll the dock's own section list to keep the current
  // section in view — never the tree, never the window (Dock rules §3).
  useEffect(() => {
    if (!currentSectionId) return;
    const container = dockScrollRef.current;
    const target = container?.querySelector(`[data-section-id="${currentSectionId}"]`);
    target?.scrollIntoView({ block: "nearest", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, [currentSectionId]);

  // One open per level: opening a region always resets whichever
  // folder was open (a folder only ever belongs to one region).
  function toggleRegion(regionId: string) {
    setOpenRegionId((current) => (current === regionId ? null : regionId));
    setOpenFolderId(null);
  }
  function toggleFolder(folderId: string) {
    setOpenFolderId((current) => (current === folderId ? null : folderId));
  }

  function openPage(slug: string) {
    setLastOpenedSlug(slug);
    onNavigate?.();
  }
  function openSearchHit(hit: SearchHit) {
    const path = findDiseasePath(subjects, hit.page.slug);
    if (path) {
      setOpenRegionId(path.region.id);
      setOpenFolderId(path.folder?.id ?? null);
    }
    setLastOpenedSlug(hit.page.slug);
    setQuery("");
    onNavigate?.();
  }

  // ---- Dock height: mode + live drag ---------------------------------
  const dockMode = useSyncExternalStore(subscribeDockMode, getDockModeSnapshot, getDockModeServerSnapshot);
  function setDockMode(mode: DockMode) {
    setDockModeStorage(mode);
  }
  function stepDock(direction: 1 | -1) {
    const idx = DOCK_ORDER.indexOf(dockMode);
    setDockMode(DOCK_ORDER[Math.min(DOCK_ORDER.length - 1, Math.max(0, idx + direction))]);
  }

  const bodyRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => setContainerHeight(entries[0].contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const halfPx = Math.round(containerHeight * HALF_RATIO);
  const fullPx = Math.max(0, containerHeight - FULL_STRIP_PX);
  const snapPx: Record<DockMode, number> = { peek: PEEK_PX, half: halfPx, full: fullPx };

  const [dragPx, setDragPx] = useState<number | null>(null);
  const dragStartRef = useRef<{ startY: number; startPx: number; moved: boolean } | null>(null);
  const didDragRef = useRef(false);

  function handleGripPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartRef.current = { startY: e.clientY, startPx: snapPx[dockMode], moved: false };
    setDragPx(snapPx[dockMode]);
  }
  function handleGripPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    const delta = start.startY - e.clientY; // dragging up increases height
    if (Math.abs(delta) > 3) start.moved = true;
    setDragPx(Math.min(fullPx, Math.max(PEEK_PX, start.startPx + delta)));
  }
  function handleGripPointerUp() {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    if (!start) return;
    if (start.moved) {
      didDragRef.current = true;
      setTimeout(() => {
        didDragRef.current = false;
      }, 0);
      const current = dragPx ?? start.startPx;
      let nearest: DockMode = "half";
      let nearestDist = Infinity;
      for (const mode of DOCK_ORDER) {
        const dist = Math.abs(snapPx[mode] - current);
        if (dist < nearestDist) {
          nearestDist = dist;
          nearest = mode;
        }
      }
      setDockMode(nearest);
    }
    setDragPx(null);
  }
  function handleBarTap(mode: DockMode) {
    if (didDragRef.current) return; // suppress the click that follows a real drag release
    setDockMode(mode);
  }

  function handleRailKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!activePath) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    if (e.key === "Escape") {
      e.preventDefault();
      setDockMode("peek");
    } else if (e.ctrlKey && e.key === "ArrowUp") {
      e.preventDefault();
      stepDock(1);
    } else if (e.ctrlKey && e.key === "ArrowDown") {
      e.preventDefault();
      stepDock(-1);
    }
  }

  const searchResults = useMemo(() => searchPages(subjects, query), [subjects, query]);
  const searching = query.trim().length > 0;
  const progressComplete = !!activePath && scrollRatio >= 0.995;
  const progressPercent = Math.round(scrollRatio * 100);

  // "2 / 4" — the page's own position among its folder siblings (or
  // region siblings, for a loose page with no folder).
  const siblingPages = activePath?.folder?.pages ?? activePath?.region.loosePages ?? [];
  const positionIndex = activePath ? siblingPages.findIndex((p) => p.slug === activePath.page.slug) + 1 : 0;

  // Mirrored onto the page's own row in the tree, whenever a page is
  // open — scrollRatio keeps tracking window scroll regardless of dock
  // height, so this stays live even at peek or full.
  const currentPagePercent = activePath && activePath.page.slug === lastOpenedSlug ? progressPercent : null;

  const sections = sectionIndex && activePath && sectionIndex.diseaseSlug === activePath.page.slug ? sectionIndex.sections : [];
  const currentSectionIndex = currentSectionId ? sections.findIndex((s) => s.id === currentSectionId) : -1;
  const sectionLabel = currentSectionIndex >= 0 ? `section ${currentSectionIndex + 1} of ${sections.length}` : "";

  const restingPx = dockMode === "full" ? fullPx : dockMode === "half" ? halfPx : PEEK_PX;
  const dockRenderPx = dragPx ?? restingPx;
  const showPeekBar = !!activePath && dockMode === "peek" && dragPx === null;
  const showFullStrip = !!activePath && dockMode === "full" && dragPx === null;
  const showDock = !!activePath && (dockMode !== "peek" || dragPx !== null);
  const dockTransitionStyle = dragPx === null && !prefersReducedMotion() ? { transition: "height 180ms ease" } : undefined;

  return (
    <div ref={railRef} onKeyDown={handleRailKeyDown} className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-1.5 px-1">
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-secondary"
            aria-hidden="true"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("findATopic")}
            className={`w-full rounded-[9px] border py-1.5 pr-2 pl-8 font-ui text-xs outline-none transition-colors duration-base ${
              searching
                ? "border-accent bg-surface text-navy shadow-[0_0_0_3px_rgba(11,122,131,0.10)]"
                : "border-border bg-surface-sunken text-primary placeholder:text-[#A6B0BC] focus:border-accent focus:bg-surface"
            }`}
          />
        </div>
        {headerAction}
      </div>

      {searching ? (
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <SearchResults results={searchResults} query={query} lastOpenedSlug={lastOpenedSlug} onSelect={openSearchHit} />
        </div>
      ) : (
        <div ref={bodyRef} className="flex min-h-0 flex-1 flex-col">
          {showFullStrip ? (
            <FullStrip pathLabel={`${activePath!.subject.name} › ${activePath!.region.name}`} onTap={() => handleBarTap("half")} />
          ) : (
            <nav className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
              <ExploreTree
                subjects={subjects}
                openRegionId={openRegionId}
                openFolderId={openFolderId}
                currentSlug={lastOpenedSlug}
                currentPercent={currentPagePercent}
                onToggleRegion={toggleRegion}
                onToggleFolder={toggleFolder}
                onPageClick={openPage}
                onNavigate={onNavigate}
              />
            </nav>
          )}

          {showPeekBar && (
            <PeekBar
              title={activePath!.page.canonicalName}
              percent={progressPercent}
              sectionLabel={sectionLabel}
              onExpand={() => handleBarTap("full")}
              onGripPointerDown={handleGripPointerDown}
              onGripPointerMove={handleGripPointerMove}
              onGripPointerUp={handleGripPointerUp}
            />
          )}

          {showDock && (
            <Dock
              scrollRef={dockScrollRef}
              heightPx={dockRenderPx}
              transitionStyle={dockTransitionStyle}
              positionIndex={positionIndex}
              positionTotal={siblingPages.length}
              title={activePath!.page.canonicalName}
              progressPercent={progressPercent}
              progressComplete={progressComplete}
              timeLabel={timeLabel}
              canExpand={dockMode !== "full"}
              onExpand={() => setDockMode("full")}
              onCollapse={() => stepDock(-1)}
              onGripPointerDown={handleGripPointerDown}
              onGripPointerMove={handleGripPointerMove}
              onGripPointerUp={handleGripPointerUp}
              path={activePath!}
              sectionIndex={sectionIndex}
              currentSectionId={currentSectionId}
              currentSubsectionId={currentSubsectionId}
              readSectionIds={readSectionIds}
              scrollRatio={scrollRatio}
              folderAdjacent={folderAdjacent}
              onSectionClick={(sectionId) => {
                beginProgrammaticScroll();
                setCurrentSectionId(sectionId);
                setCurrentSubsectionId(null);
              }}
              onNavigate={onNavigate}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SearchResults({
  results,
  query,
  lastOpenedSlug,
  onSelect,
}: {
  results: SearchHit[];
  query: string;
  lastOpenedSlug: string | undefined;
  onSelect: (hit: SearchHit) => void;
}) {
  return (
    <div className="flex flex-col">
      <div className="px-3 pt-1.5 pb-1 font-ui text-[9.5px] font-black tracking-[1.3px] text-[#9AA5B4] uppercase">
        {results.length} results
      </div>
      {results.map((hit) => {
        const isLast = hit.page.slug === lastOpenedSlug;
        return (
          <Link
            key={hit.page.slug}
            href={`/conditions/${hit.page.slug}`}
            onClick={() => onSelect(hit)}
            className={`mx-1 rounded-[9px] px-2.5 py-2 transition-colors duration-base ${isLast ? "bg-acc-bg" : "hover:bg-border/40"}`}
          >
            <div className={`font-ui text-[12.5px] leading-tight font-extrabold ${isLast ? "text-acc-ink" : "text-navy"}`}>
              {highlightMatch(hit.page.canonicalName, query)}
            </div>
            <div className="mt-0.5 font-ui text-[10.5px] font-semibold text-[#A6B0BC]">{hit.pathLabel}</div>
          </Link>
        );
      })}
    </div>
  );
}

// The straight-line tree — regions and folders always listed (one
// open per level; opening one collapses whatever sibling was open),
// indented with a straight guide line per LIBRARY-FINAL-SPEC.md.
// Full role="tree"/arrow-key navigation is deliberately deferred (not
// part of this pass) — applying role="tree" without the matching
// keyboard contract would be a worse experience for screen-reader
// users than plain semantic buttons/links, so this uses aria-expanded
// disclosure + aria-current instead until that follow-up lands.
function ExploreTree({
  subjects,
  openRegionId,
  openFolderId,
  currentSlug,
  currentPercent,
  onToggleRegion,
  onToggleFolder,
  onPageClick,
  onNavigate,
}: {
  subjects: RailSubject[];
  openRegionId: string | null;
  openFolderId: string | null;
  currentSlug: string | undefined;
  currentPercent: number | null;
  onToggleRegion: (regionId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onPageClick: (slug: string) => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col px-1 pb-2">
      {subjects.map((subject) => (
        <div key={subject.id}>
          <div className={GROUP_LABEL_CLASS}>{subject.name}</div>
          {subject.regions.map((region) => (
            <RegionNode
              key={region.id}
              region={region}
              isOpen={region.id === openRegionId}
              openFolderId={openFolderId}
              currentSlug={currentSlug}
              currentPercent={currentPercent}
              onToggleRegion={onToggleRegion}
              onToggleFolder={onToggleFolder}
              onPageClick={onPageClick}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function RegionNode({
  region,
  isOpen,
  openFolderId,
  currentSlug,
  currentPercent,
  onToggleRegion,
  onToggleFolder,
  onPageClick,
  onNavigate,
}: {
  region: RailRegion;
  isOpen: boolean;
  openFolderId: string | null;
  currentSlug: string | undefined;
  currentPercent: number | null;
  onToggleRegion: (regionId: string) => void;
  onToggleFolder: (folderId: string) => void;
  onPageClick: (slug: string) => void;
  onNavigate?: () => void;
}) {
  const RegionIcon = region.icon ? topicIcons[region.icon] : null;
  return (
    <>
      <button type="button" onClick={() => onToggleRegion(region.id)} aria-expanded={isOpen} className={TREE_ROW_CLASS}>
        <span
          className={`${TREE_TILE_CLASS} ${region.color ? CARD_COLOR_CHIP[region.color] : TREE_TILE_REGION_DEFAULT_CLASS}`}
          aria-hidden="true"
        >
          {RegionIcon && <RegionIcon className="size-3" />}
        </span>
        <span className={`min-w-0 flex-1 ${isOpen ? "text-navy" : ""}`}>{region.name}</span>
        <span className={`ml-auto shrink-0 pl-1.5 font-ui text-[11px] font-black ${isOpen ? "text-navy" : "text-[#AAB4C1]"}`} aria-hidden="true">
          {isOpen ? "⌄" : "›"}
        </span>
      </button>
      {isOpen && (
        <div className={GUIDE_LINE_CLASS}>
          {region.folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              isOpen={folder.id === openFolderId}
              currentSlug={currentSlug}
              currentPercent={currentPercent}
              onToggleFolder={onToggleFolder}
              onPageClick={onPageClick}
              onNavigate={onNavigate}
            />
          ))}
          {region.loosePages.map((page) => (
            <PageRow
              key={page.slug}
              page={page}
              isCurrent={page.slug === currentSlug}
              percent={page.slug === currentSlug ? currentPercent : null}
              onClick={() => onPageClick(page.slug)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

function FolderNode({
  folder,
  isOpen,
  currentSlug,
  currentPercent,
  onToggleFolder,
  onPageClick,
  onNavigate,
}: {
  folder: RailFolder;
  isOpen: boolean;
  currentSlug: string | undefined;
  currentPercent: number | null;
  onToggleFolder: (folderId: string) => void;
  onPageClick: (slug: string) => void;
  onNavigate?: () => void;
}) {
  const hasPages = folder.pages.length > 0;
  const FolderIcon = folder.icon ? topicIcons[folder.icon] : null;
  return (
    <>
      <button
        type="button"
        disabled={!hasPages}
        onClick={() => onToggleFolder(folder.id)}
        aria-expanded={hasPages ? isOpen : undefined}
        className={`${TREE_ROW_CLASS} disabled:opacity-40`}
      >
        <span
          className={`${TREE_TILE_CLASS} ${folder.color ? CARD_COLOR_CHIP[folder.color] : TREE_TILE_FOLDER_DEFAULT_CLASS}`}
          aria-hidden="true"
        >
          {FolderIcon && <FolderIcon className="size-3" />}
        </span>
        <span className={`min-w-0 flex-1 ${isOpen ? "text-navy" : ""}`}>{folder.name}</span>
        {hasPages && (
          <span className={`ml-auto shrink-0 pl-1.5 font-ui text-[11px] font-black ${isOpen ? "text-navy" : "text-[#AAB4C1]"}`} aria-hidden="true">
            {isOpen ? "⌄" : "›"}
          </span>
        )}
      </button>
      {isOpen && hasPages && (
        <div className={GUIDE_LINE_CLASS}>
          {folder.pages.map((page) => (
            <PageRow
              key={page.slug}
              page={page}
              isCurrent={page.slug === currentSlug}
              percent={page.slug === currentSlug ? currentPercent : null}
              onClick={() => onPageClick(page.slug)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

function PageRow({
  page,
  isCurrent,
  percent,
  onClick,
  onNavigate,
}: {
  page: RailPage;
  isCurrent: boolean;
  percent: number | null;
  onClick: () => void;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={`/conditions/${page.slug}`}
      aria-current={isCurrent ? "page" : undefined}
      onClick={() => {
        onClick();
        onNavigate?.();
      }}
      className={`${PAGE_ROW_CLASS} ${isCurrent ? PAGE_ROW_CURRENT_CLASS : PAGE_ROW_DEFAULT_CLASS}`}
    >
      <span className={`mt-1.5 mr-[5px] ml-1.5 size-[5px] shrink-0 rounded-full ${isCurrent ? "bg-navy" : "bg-[#B8C1CD]"}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">{page.canonicalName}</span>
      {percent != null && <span className="shrink-0 pl-1.5 font-ui text-[10px] font-extrabold text-navy">{percent}%</span>}
    </Link>
  );
}

// "Show the library" — the tree's stand-in while the dock is full.
// A plain <button> (not the drag-grip pattern Dock/PeekBar use) since
// its content is all inert spans — no nested interactive elements to
// worry about.
function FullStrip({ pathLabel, onTap }: { pathLabel: string; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="flex w-full shrink-0 items-center gap-2 border-b border-border bg-surface px-2.5 py-2 text-left font-ui text-[11.5px] font-extrabold text-navy transition-colors duration-base hover:bg-[#EAEEF3]"
    >
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-[6px] bg-navy/[0.08] font-ui text-[11px]" aria-hidden="true">
        ▴
      </span>
      Show the library
      <span className="ml-auto shrink-0 truncate font-ui text-[10px] font-bold text-[#9AA5B4]">{pathLabel}</span>
    </button>
  );
}

// The navy bar the dock tucks to at "peek" — the whole bar is a tap
// target back to half; the grip is its own real button (the spec's
// own requirement) so a drag can start from either state.
function PeekBar({
  title,
  percent,
  sectionLabel,
  onExpand,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
}: {
  title: string;
  percent: number;
  sectionLabel: string;
  onExpand: () => void;
  onGripPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onGripPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onGripPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      onClick={onExpand}
      className="flex shrink-0 cursor-pointer flex-col overflow-hidden rounded-t-[14px] bg-navy px-2.5 pt-1.5 pb-2.5 shadow-[0_-8px_20px_rgba(20,40,74,0.18)]"
    >
      <div
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        className="flex h-4 shrink-0 touch-none items-center justify-center"
      >
        <span className="h-1 w-9 rounded-[3px] bg-white/35" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-[9px]">
        <span
          className="relative flex size-[30px] shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(var(--color-acc) ${percent}%, rgba(255,255,255,.16) 0)` }}
          aria-hidden="true"
        >
          <span className="size-[22px] rounded-full bg-navy" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-ui text-[8.5px] font-black tracking-[1.2px] text-acc-dk">STILL READING</div>
          <div className="mt-px truncate font-ui text-[13px] text-white">{title}</div>
          <div className="mt-px truncate font-ui text-[10px] font-bold text-[#9DB0CA]">
            {percent}% {sectionLabel && `· ${sectionLabel}`}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onExpand();
          }}
          aria-label="Expand reading panel"
          className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-white/[0.14] font-ui text-[13px] font-black text-white"
        >
          ▴
        </button>
      </div>
    </div>
  );
}

function Dock({
  scrollRef,
  heightPx,
  transitionStyle,
  positionIndex,
  positionTotal,
  title,
  progressPercent,
  progressComplete,
  timeLabel,
  canExpand,
  onExpand,
  onCollapse,
  onGripPointerDown,
  onGripPointerMove,
  onGripPointerUp,
  path,
  sectionIndex,
  currentSectionId,
  currentSubsectionId,
  readSectionIds,
  scrollRatio,
  folderAdjacent,
  onSectionClick,
  onNavigate,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  heightPx: number;
  transitionStyle: { transition: string } | undefined;
  positionIndex: number;
  positionTotal: number;
  title: string;
  progressPercent: number;
  progressComplete: boolean;
  timeLabel: string;
  canExpand: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onGripPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onGripPointerMove: (e: ReactPointerEvent<HTMLDivElement>) => void;
  onGripPointerUp: (e: ReactPointerEvent<HTMLDivElement>) => void;
  path: DiseasePath;
  sectionIndex: SectionIndex | null;
  currentSectionId: string | null;
  currentSubsectionId: string | null;
  readSectionIds: Set<string>;
  scrollRatio: number;
  folderAdjacent: FolderAdjacent | null;
  onSectionClick: (sectionId: string) => void;
  onNavigate?: () => void;
}) {
  const sections: SectionIndexEntry[] = sectionIndex?.diseaseSlug === path.page.slug ? sectionIndex.sections : [];
  const isLastSection = sections.length > 0 && sections[sections.length - 1].id === currentSectionId;
  const folderLabel = path.folder?.name ?? path.region.name;
  const linePercent = Math.round(scrollRatio * 100);

  return (
    <div
      className="relative flex flex-none flex-col overflow-hidden rounded-t-[14px] border-t border-border bg-surface shadow-[0_-10px_24px_rgba(20,40,74,0.12)]"
      style={{ height: heightPx, ...transitionStyle }}
    >
      <div
        onPointerDown={onGripPointerDown}
        onPointerMove={onGripPointerMove}
        onPointerUp={onGripPointerUp}
        onPointerCancel={onGripPointerUp}
        role="button"
        aria-label="Resize reading panel"
        tabIndex={0}
        className="flex h-4 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
      >
        <span className="h-1 w-9 rounded-[3px] bg-[#C7CFDA]" aria-hidden="true" />
      </div>

      <div className="mx-2 shrink-0 rounded-[10px] bg-navy px-[11px] pt-2.5 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-ui text-[9px] font-black tracking-[1.2px] text-acc-dk">
              READING · {positionIndex} / {positionTotal}
            </div>
            <div className="mt-0.5 font-ui text-[14px] leading-[1.15] font-black text-white">{title}</div>
          </div>
          <div className="flex shrink-0 gap-[5px]">
            {canExpand && (
              <button
                type="button"
                onClick={onExpand}
                aria-label="Expand reading panel"
                className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-white/[0.14] font-ui text-xs font-black text-white transition-colors duration-base hover:bg-white/[0.24]"
              >
                ▴
              </button>
            )}
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse reading panel"
              className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-white/[0.14] font-ui text-xs font-black text-white transition-colors duration-base hover:bg-white/[0.24]"
            >
              ▾
            </button>
          </div>
        </div>
        <div className="mt-[9px] h-[3px] overflow-hidden rounded-[2px] bg-white/[0.14]">
          <div
            className={`h-[3px] motion-safe:transition-[width,background-color] ${progressComplete ? "bg-[#4FBF86]" : "bg-acc"}`}
            style={{ width: `${progressPercent}%` }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-[5px] font-ui text-[10px] font-bold text-[#9DB0CA]">
          {progressComplete ? "Read" : `${progressPercent}% · ${timeLabel}`}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pt-2.5 pb-1 font-ui text-[9.5px] font-black tracking-[1.3px] text-[#9AA5B4]">ON THIS PAGE</div>
        <div
          className="mr-1.5 ml-4 flex flex-col pl-1.5"
          style={{
            backgroundImage: `linear-gradient(to bottom, var(--color-acc) 0, var(--color-acc) ${linePercent}%, #D0D7E1 ${linePercent}%, #D0D7E1 100%)`,
            backgroundPosition: "left top",
            backgroundSize: "1.5px 100%",
            backgroundRepeat: "no-repeat",
          }}
        >
          {sections.map((section, index) => {
            const current = section.id === currentSectionId;
            const read = readSectionIds.has(section.id);
            const currentSubIndex = current ? section.subsections.findIndex((s) => s.id === currentSubsectionId) : -1;
            return (
              <div key={section.id} data-section-id={section.id}>
                <Link
                  href={`/conditions/${path.page.slug}#${section.id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={() => {
                    onSectionClick(section.id);
                    onNavigate?.();
                  }}
                  className={`flex items-center gap-[9px] rounded-lg px-[9px] py-[5px] font-ui text-[12.5px] font-bold transition-colors duration-base hover:bg-[#EAEEF3] ${
                    current ? "bg-acc-bg text-acc-ink" : read ? "text-[#A6B0BC]" : "text-primary"
                  }`}
                >
                  <span
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border font-ui text-[9.5px] font-black ${
                      current
                        ? "border-acc bg-acc text-white"
                        : read
                          ? "border-acc-bd bg-acc-bg text-acc-ink"
                          : "border-border bg-surface text-[#9AA5B4]"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{section.heading}</span>
                </Link>

                {current && section.subsections.length > 0 && (
                  <div className="flex flex-col">
                    {section.subsections.map((sub, subIndex) => {
                      const subCurrent = sub.id === currentSubsectionId;
                      const subRead = currentSubIndex !== -1 && subIndex < currentSubIndex;
                      return (
                        <Link
                          key={sub.id}
                          href={`/conditions/${path.page.slug}#${sub.id}`}
                          onClick={() => {
                            onSectionClick(section.id);
                            onNavigate?.();
                          }}
                          className={`py-[3px] pr-[9px] pl-9 font-ui text-[11.5px] transition-colors duration-base hover:text-primary ${
                            subCurrent ? "font-extrabold text-acc-ink" : subRead ? "text-[#B4BDC8]" : "text-secondary"
                          }`}
                        >
                          {sub.heading}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* "Next appears near the end" — a quiet card once the reader
            reaches the last section, filling navy once the page is
            complete. Folder-scoped: never alphabetical, never "recently
            opened". */}
        {isLastSection && folderAdjacent?.next && (
          <>
            {progressComplete && (
              <div className="mx-[10px] mt-3 flex items-center gap-2 rounded-[10px] border-2 border-trust bg-trust-bg px-[11px] py-[9px]">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-trust font-ui text-[11px] font-black text-white" aria-hidden="true">
                  ✓
                </span>
                <span className="font-ui text-xs font-black text-trust">Page complete</span>
              </div>
            )}
            <Link
              href={`/conditions/${folderAdjacent.next.slug}`}
              className={`mx-[10px] mt-3 mb-3 block rounded-[10px] border px-[11px] py-[9px] transition-colors duration-base ${
                progressComplete ? "border-navy bg-navy text-right hover:bg-navy/90" : "border-border bg-surface hover:border-acc"
              }`}
            >
              <div className={`font-ui text-[9px] font-black tracking-[1.2px] uppercase ${progressComplete ? "text-acc-dk" : "text-secondary"}`}>
                Next in {folderLabel}
              </div>
              <div className={`mt-0.5 font-ui text-[12.5px] leading-tight font-black ${progressComplete ? "text-white" : "text-navy"}`}>
                {folderAdjacent.next.canonicalName}
                {progressComplete ? " →" : ""}
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
