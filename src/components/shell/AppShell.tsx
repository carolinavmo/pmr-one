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
export async function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        {children}
      </div>
    </div>
  );
}
