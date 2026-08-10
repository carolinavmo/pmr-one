import type { CardIconName } from "@/components/ui/cardIcons";

// Derives a body-region icon and short category label from the
// anatomy regions linked to a disease's illustrations, so a card grid
// of diseases doesn't show the same generic icon for every row
// (product review finding — the /conditions and homepage grids were
// visually undifferentiated), and a Disease Page hero can show a real
// region eyebrow (VISUAL_IDENTITY.md §2). Keyword-matched against real
// region text already in the database (anatomy_structure.region)
// rather than a manually maintained per-disease map, so a new disease
// gets a sensible icon and category automatically as soon as it has
// an illustration, no lookup table to keep in sync.
const REGION_KEYWORDS: [RegExp, CardIconName, string][] = [
  [/foot|ankle|hindfoot|midfoot|calcaneal/i, "footprints", "Foot & Ankle"],
  [/wrist|hand|carpal/i, "hand", "Wrist & Hand"],
  [/face|facial|cranial nerve/i, "smile", "Face"],
  [/knee|hip|shoulder|joint/i, "bone", "Knee & Hip"],
];

function matchRegion(regions: (string | null)[]) {
  for (const region of regions) {
    if (!region) continue;
    const match = REGION_KEYWORDS.find(([pattern]) => pattern.test(region));
    if (match) return match;
  }
  return undefined;
}

export function iconForRegions(regions: (string | null)[]): CardIconName | undefined {
  return matchRegion(regions)?.[1];
}

export function categoryForRegions(regions: (string | null)[]): string | undefined {
  return matchRegion(regions)?.[2];
}
