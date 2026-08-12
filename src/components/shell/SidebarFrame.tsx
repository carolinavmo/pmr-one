"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import {
  Sparkles,
  Calculator,
  Calendar,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import { IndexSidebar } from "./IndexSidebar";
import { LinkButton } from "@/components/ui/LinkButton";

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
  const tCommon = useTranslations("common");

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label={t("showExplore")}
        title={t("showExplore")}
        className="sticky top-4 left-4 z-20 hidden size-10 shrink-0 items-center justify-center self-start rounded-full border border-border bg-surface text-secondary shadow-lg transition-colors duration-base hover:text-accent lg:flex"
      >
        <PanelLeftOpen className="size-4.5" aria-hidden="true" />
      </button>
    );
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-80 shrink-0 flex-col border-r border-border bg-surface-raised lg:flex">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <Image src="/brand-logo-v2.png" alt="" width={1381} height={1139} priority className="h-9 w-auto shrink-0" />
          <span className="truncate font-heading text-base font-semibold text-primary">
            PM&amp;R Atlas
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label={t("collapseSidebar")}
          title={t("collapseSidebar")}
          className="flex size-7 shrink-0 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
        >
          <PanelLeftClose className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-3">
        <IndexSidebar tree={tree} />
      </div>

      <div className="flex flex-col gap-3 border-t border-border p-3">
        <Link
          href="/clinical-tools"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Calculator className="size-4" aria-hidden="true" />
          </span>
          <span className="font-ui text-sm font-medium text-primary">{t("clinicalTools")}</span>
        </Link>
        <Link
          href="/study-planner"
          className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors duration-base hover:bg-border/40"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Calendar className="size-4" aria-hidden="true" />
          </span>
          <span className="font-ui text-sm font-medium text-primary">{t("studyPlanner")}</span>
        </Link>

        <div className="flex items-center gap-3 rounded-lg border border-dashed border-border px-3 py-2.5 opacity-70">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-border/40 text-secondary">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <span className="font-ui text-sm font-medium text-primary">{t("aiAssistant")}</span>
            <span className="font-ui text-xs text-secondary">{tCommon("comingSoon")}</span>
          </div>
        </div>

        {userEmail || userName ? (
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
        ) : (
          <LinkButton href="/login" variant="secondary" className="w-full justify-center">
            {tCommon("signIn")}
          </LinkButton>
        )}
      </div>
    </aside>
  );
}
