import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

// One chrome set for every visitor, signed in or not — the Index
// (topic tree) is real public reference content, not an account
// feature, so there's no reason to withhold the sidebar from a
// signed-out reader the way the old Header-only branch did. Sidebar
// hides itself below `lg` (own file) and handles its own
// collapse/expand; TopBar's mobile fallback covers exactly what
// Sidebar stops providing at that width, so there's no gap at any
// viewport or session state.
//
// TopBar spans the full viewport width and sits above everything else
// (it owns the brand wordmark) — Sidebar starts in a row below it,
// not alongside it for the full page height, so this is a column
// (TopBar, then a row) rather than the row-only layout this used to
// be. Sidebar reads its own sticky offset off TopBar's actual
// rendered height (see SidebarFrame.tsx) since that varies by locale
// and viewport.
export async function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  );
}
