"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu, X } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import { IndexSidebar } from "./IndexSidebar";

interface MobileIndexDrawerFrameProps {
  tree: TopicNode[];
  isSignedIn: boolean;
}

// Below `lg`, Sidebar hides itself entirely (own file, `hidden ...
// lg:flex`), so this is the only way a mobile visitor can reach the
// Index tree — same slide-in-drawer shape WorkspaceDrawer.tsx already
// established (edge trigger + backdrop + slide panel), mirrored to
// the left edge instead of the right. Fetches its own `tree` via the
// parent server component (MobileIndexDrawer.tsx) rather than sharing
// Sidebar's — the two render in unrelated branches of AppShell
// (Sidebar vs. TopBar), and the topic table is small enough that one
// extra query is cheaper than wiring cross-component shared state just
// to avoid it.
export function MobileIndexDrawerFrame({ tree, isSignedIn }: MobileIndexDrawerFrameProps) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("openExplore")}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40 hover:text-primary lg:hidden"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("explore")}
        className={`fixed top-0 left-0 z-50 flex h-full w-80 max-w-[85vw] flex-col gap-3 border-r border-border bg-surface-raised p-4 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-center justify-end">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeExplore")}
            className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        {/* min-h-0 so IndexSidebar's own <nav> is the sole scrolling
            ancestor its sticky bands measure against — an overflow-
            auto aside above it would be exactly the kind of second
            scroll container SIDEBAR-SPEC.md warns silently breaks
            sticky. */}
        <div className="flex min-h-0 flex-1 flex-col">
          <IndexSidebar tree={tree} isSignedIn={isSignedIn} onNavigate={() => setOpen(false)} />
        </div>
      </aside>
    </>
  );
}
