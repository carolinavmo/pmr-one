"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  Sparkles,
  Calculator,
  Calendar,
  ChevronRight,
  Layers,
  ListChecks,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
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
  userRole: string | undefined;
}

// The interactive shell around the server-fetched tree/session data —
// Sidebar.tsx itself stays a server component (it needs `auth()`), so
// the collapse toggle (client-only state, read via useSyncExternalStore
// for the same SSR-safety reasons as the old Contents-minimize toggle)
// lives in this small client leaf instead.
export function SidebarFrame({ tree, userName, userEmail, userRole }: SidebarFrameProps) {
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
      className="sticky hidden w-80 shrink-0 flex-col border-r border-border bg-surface-raised lg:flex"
    >
      <div className="relative flex flex-col gap-0.5 border-b border-border px-3 pt-3 pb-2">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t("collapseSidebar")}
          title={t("collapseSidebar")}
          className="absolute top-2 right-2 flex size-6 shrink-0 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <PanelLeftClose className="size-3.5" aria-hidden="true" />
        </button>
        <Link
          href="/clinical-tools"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Calculator className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-ui text-xs font-medium text-primary">{t("clinicalTools")}</span>
        </Link>
        <Link
          href="/study-planner"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Calendar className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-ui text-xs font-medium text-primary">{t("studyPlanner")}</span>
        </Link>
        <Link
          href="/my-atlas"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <NotebookPen className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-ui text-xs font-medium text-primary">{t("myAtlas")}</span>
        </Link>
        <Link
          href="/flashcards"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Layers className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-ui text-xs font-medium text-primary">{t("flashcards")}</span>
        </Link>
        <Link
          href="/question-bank"
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <ListChecks className="size-3.5" aria-hidden="true" />
          </span>
          <span className="font-ui text-xs font-medium text-primary">{t("questionBank")}</span>
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-3">
        <IndexSidebar tree={tree} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-3">
        {!(userEmail || userName) && (
          <div className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-ui text-sm font-medium text-white">{t("goPremium")}</span>
              <span className="font-ui text-xs text-white/80">{t("goPremiumSubtitle")}</span>
            </div>
          </div>
        )}

        {(userEmail || userName) && (
          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-base hover:bg-border/40"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent font-ui text-sm font-semibold text-white">
              {(userName?.trim()[0] ?? userEmail?.[0] ?? "?").toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col leading-tight">
              <span className="truncate font-ui text-sm font-medium text-primary">
                {userName ?? userEmail}
              </span>
              <span className="truncate font-ui text-xs text-secondary capitalize">{userRole}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          </Link>
        )}
      </div>
    </aside>
  );
}
