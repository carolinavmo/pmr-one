"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { Menu, X } from "lucide-react";
import type { TopicNode } from "@/lib/topics";
import type { CalculatorCategory, CalculatorSummary } from "@/lib/clinical-tools";
import { IndexSidebar } from "./IndexSidebar";
import { ClinicalToolsSidebar } from "@/components/clinical-tools/ClinicalToolsSidebar";

interface MobileIndexDrawerFrameProps {
  tree: TopicNode[];
  isSignedIn: boolean;
  calculatorCategories: CalculatorCategory[];
  calculators: CalculatorSummary[];
  favoritedCalculatorIds: Set<string>;
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
export function MobileIndexDrawerFrame({
  tree,
  isSignedIn,
  calculatorCategories,
  calculators,
  favoritedCalculatorIds,
}: MobileIndexDrawerFrameProps) {
  const t = useTranslations("nav");
  const tTools = useTranslations("clinicalTools");
  const pathname = usePathname();
  const isClinicalTools = pathname.startsWith("/clinical-tools");
  const isMyHandbook = pathname.startsWith("/my-atlas");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const label = isClinicalTools ? tTools("categoriesGroup") : t("explore");

  // HANDBOOK-SPEC.md: no library tree on this route at all, and the
  // handbook's own rail lives inline in the page content (not behind a
  // drawer trigger) — nothing for this button to open here.
  if (isMyHandbook) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isClinicalTools ? tTools("categoriesGroup") : t("openExplore")}
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

      {/* TOOLS-IMPLEMENTATION.md Pass 4: "the sidebar becomes a
          'Categories' sheet from the top" on /clinical-tools* — a
          distinct entry direction (slides down, not in from the left)
          from the topic-tree drawer below it, which every other route
          keeps unchanged. */}
      {isClinicalTools ? (
        <aside
          aria-label={label}
          className={`fixed inset-x-0 top-0 z-50 flex max-h-[80vh] flex-col gap-3 rounded-b-2xl border-b border-border bg-surface-raised p-4 shadow-xl transition-transform duration-base ${
            open ? "translate-y-0" : "-translate-y-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between">
            <span className="font-ui text-sm font-black text-navy">{label}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("closeExplore")}
              className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <ClinicalToolsSidebar
              categories={calculatorCategories}
              calculators={calculators}
              favoritedIds={favoritedCalculatorIds}
            />
          </div>
        </aside>
      ) : (
        <aside
          aria-label={label}
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
      )}
    </>
  );
}
