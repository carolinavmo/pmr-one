"use server";

import { pool } from "@/lib/db";
import { requireEditor } from "@/lib/actions/authoring";
import { revalidateShellSurfaces } from "@/lib/revalidation";

export async function updateHomepageHeroTextAction(
  field: "title" | "subtitle",
  value: string,
) {
  await requireEditor();
  await pool.query(
    `UPDATE homepage_hero SET ${field} = $1, updated_at = now() WHERE id = 1`,
    [value],
  );
  revalidateShellSurfaces();
}

// Targets one field on one card via jsonb_set rather than sending the
// whole cards array back — cards are a fixed 4-slot list (no add/
// remove UI), so a per-field patch is simpler than dashboard-hero's
// read-modify-write-the-whole-array approach, which exists there to
// support a dynamic-length list this feature doesn't need.
export async function updateHomepageHeroCardFieldAction(
  index: number,
  field: "title" | "body",
  value: string,
) {
  await requireEditor();
  await pool.query(
    `UPDATE homepage_hero
     SET cards = jsonb_set(cards, ARRAY[$1::text, $2::text], to_jsonb($3::text)), updated_at = now()
     WHERE id = 1`,
    [String(index), field, value],
  );
  revalidateShellSurfaces();
}
