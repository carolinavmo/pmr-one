import { revalidatePath } from "next/cache";

// Route *patterns*, not literal paths — every reader-facing route now
// lives under a locale prefix (`/en/...`, `/pt-pt/...`, ...), so a
// literal `revalidatePath(\`/conditions/${slug}\`)` would only ever
// invalidate one locale's cache entry for one slug, silently leaving
// the other three stale. `revalidatePath` treats a path containing a
// dynamic segment as the route's pattern, matching every param value
// (every locale, every slug) in one call — this is the only shape of
// call that's still correct post-migration.

// Called after any write that changes a disease's own page content
// (a block edit, a Knowledge Graph object update, publish/unpublish).
export function revalidateDiseaseSurfaces() {
  revalidatePath("/[locale]/conditions/[slug]", "page");
}

// Called after any write that changes something rendered outside a
// single disease page: the topic tree (read by the root layout's
// sidebar on every route, the catalog's `?topic=` filter, and every
// disease page's breadcrumbs), the review queue, or the dashboard
// hero (rendered on the homepage).
// Called after a calculator favorite toggle — the only write /
// clinical-tools itself needs to react to.
export function revalidateClinicalToolsSurfaces() {
  revalidatePath("/[locale]/clinical-tools", "page");
}

// Called after any write to a member's own "My PM&R Atlas" pages/sections.
export function revalidateAtlasSurfaces() {
  revalidatePath("/[locale]/my-atlas", "page");
}

// Called after any write to a deck or card (create/rename/recolor/
// delete/reorder) or a review (box/due-date change) — covers both the
// deck-list index and the detail route since either can show stale
// names, counts, or progress after a mutation on the other.
export function revalidateFlashcardSurfaces() {
  revalidatePath("/[locale]/flashcards", "page");
  revalidatePath("/[locale]/flashcards/[deckId]", "page");
}

export function revalidateShellSurfaces() {
  revalidatePath("/[locale]", "layout");
  revalidatePath("/[locale]", "page");
  revalidatePath("/[locale]/conditions", "page");
  revalidatePath("/[locale]/admin", "page");
  revalidatePath("/[locale]/admin/topics", "page");
}
