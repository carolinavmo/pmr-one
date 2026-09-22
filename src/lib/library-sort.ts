// Pulled out of library-home.ts on purpose — that file imports `pool`
// (the `pg` driver) at module scope, so any client component that
// imports even one runtime value from it drags `pg` into the browser
// bundle (the exact failure mode card-colors.ts's own DEFAULT_BRANCH_CYCLE
// comment warns about). This file has no imports at all, so
// BrowseByArea.tsx (a "use client" component) can read the sort
// vocabulary without pulling in the database driver.
export type LibrarySort = "reading_order" | "alpha" | "shortest" | "recently_updated";

export const LIBRARY_SORT_ORDER: LibrarySort[] = ["reading_order", "alpha", "shortest", "recently_updated"];

export const LIBRARY_SORT_LABEL: Record<LibrarySort, string> = {
  reading_order: "Reading order",
  alpha: "A–Z",
  shortest: "Shortest first",
  recently_updated: "Recently updated",
};

export function isLibrarySort(value: unknown): value is LibrarySort {
  return typeof value === "string" && (LIBRARY_SORT_ORDER as string[]).includes(value);
}
