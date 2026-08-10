import { CircleCheck, Ban, Triangle, type LucideIcon } from "lucide-react";
import type { ManeuverRelationship } from "@/lib/editorial-blocks";

// VISUAL_IDENTITY.md §6 — one glyph + one color per relationship type,
// used identically everywhere a typed relationship appears. Augments
// the existing plain-language label (maneuverRelationshipLabel), never
// replaces it. `assesses_contributing_factor` uses a plain outline
// triangle, not a warning/alert shape — that visual language is
// reserved for genuinely red-flag content (Tier 1), and a contributing
// factor is not that.
export const relationshipGlyph: Record<
  ManeuverRelationship,
  { Icon: LucideIcon; colorClass: string }
> = {
  confirms: { Icon: CircleCheck, colorClass: "text-accent" },
  rules_out: { Icon: Ban, colorClass: "text-warning" },
  assesses_contributing_factor: { Icon: Triangle, colorClass: "text-insight" },
};
