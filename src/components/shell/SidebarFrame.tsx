"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import { IndexSidebar } from "./IndexSidebar";

// Persisted app-wide (not per-page) — same collapsed/expanded
// preference should hold as a reader moves around the site, same
// reasoning ContentsRail's own now-removed minimize toggle used.
const COLLAPSED_STORAGE_KEY = "pmr-atlas:sidebar-collapsed";

let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function getSnapshot() {
  return localStorage.getItem(COLLAPSED_STORAGE_KEY) === "true";
}

function getServerSnapshot() {
  return false;
}

function setCollapsed(value: boolean) {
  localStorage.setItem(COLLAPSED_STORAGE_KEY, String(value));
  for (const listener of listeners) listener();
}

interface SidebarFrameProps {
  tree: TopicNode[];
  userName: string | null | undefined;
  userEmail: string | null | undefined;
}

// The interactive shell around the server-fetched tree/session data —
// Sidebar.tsx itself stays a server component (it needs `auth()`), so
// the collapse toggle (client-only state, read via useSyncExternalStore
// for the same SSR-safety reasons as the old Contents-minimize toggle)
// lives in this small client leaf instead.
export function SidebarFrame({ tree, userName, userEmail }: SidebarFrameProps) {
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations("nav");
  const pathname = usePathname();
  const signedOut = !(userEmail || userName);

  // The sidebar now sits in a row below TopBar (the brand wordmark
  // moved there) rather than spanning the full viewport height itself,
  // so its own sticky offset and height have to track TopBar's actual
  // rendered height — which varies by locale (text length) and
  // viewport (TopBar's row can wrap) — rather than assuming 0. Same
  // ResizeObserver-on-the-header pattern CalculatorRunner.tsx already
  // uses for its sticky progress bar, for the same reason.
  const [topOffset, setTopOffset] = useState(0);
  useEffect(() => {
    const header = document.querySelector("header");
    if (!header) return;
    const updateOffset = () => setTopOffset(header.getBoundingClientRect().height);
    updateOffset();
    const observer = new ResizeObserver(updateOffset);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // A signed-out visitor lands on the homepage's own guest hero — the
  // Index (topic tree) has nowhere to anchor yet (no disease page is
  // open), so it stays out of the way until they actually go
  // somewhere (Explore Conditions, sign in, ...). Every other route,
  // and every signed-in visitor, still gets the persistent sidebar.
  // Below every hook so this early return never changes hook order.
  if (signedOut && pathname === "/") {
    return null;
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t("showExplore")}
        title={t("showExplore")}
        style={{ top: topOffset + 16 }}
        className="sticky left-4 z-20 hidden size-10 shrink-0 items-center justify-center self-start rounded-full border border-border bg-surface text-secondary shadow-lg transition-colors duration-base hover:text-accent lg:flex"
      >
        <PanelLeftOpen className="size-4.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside
      style={{ top: topOffset, height: `calc(100vh - ${topOffset}px)` }}
      className="sticky hidden w-[312px] shrink-0 flex-col border-r border-border bg-surface-raised lg:flex"
    >
      {/* NAVBAR-SPEC.md — the six tool links that used to open this
          header region moved to the navbar's own Row 2
          (NavbarFrame.tsx), same routes/behavior, different chrome.
          This rail now owns only the Explore tree and its collapse
          toggle — folded into IndexSidebar's own search row via
          headerAction rather than a dedicated bordered strip above it,
          which read as empty space. */}
      {/* No overflow-y-auto here — SIDEBAR-SPEC.md's sticky bands need
          exactly one unambiguous scrolling ancestor (IndexSidebar's own
          <nav>) between them and the band and its `top` offset; a second
          scrollable ancestor above it is exactly the kind of thing that
          silently breaks position: sticky. */}
      <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
        <IndexSidebar
          tree={tree}
          isSignedIn={!signedOut}
          headerAction={
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label={t("collapseSidebar")}
              title={t("collapseSidebar")}
              className="flex size-7 shrink-0 items-center justify-center rounded-[9px] border border-border text-secondary transition-colors duration-base hover:bg-border/40 hover:text-primary"
            >
              <PanelLeftClose className="size-3.5" aria-hidden="true" />
            </button>
          }
        />
      </div>
    </aside>
  );
}
