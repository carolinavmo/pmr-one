import { NextResponse } from "next/server";
import { getPublishedDiseases } from "@/lib/disease-catalog";
import type { SearchableItem } from "@/components/ui/SearchExperience";

// No query params — the catalog is small enough (a handful of
// diseases) that filtering happens client-side in SearchExperience;
// this route's only job is to return everything searchable once per
// command-palette open, not to rank or paginate.
export async function GET() {
  const diseases = await getPublishedDiseases();

  const items: SearchableItem[] = diseases.map((disease) => ({
    id: disease.id,
    type: "disease",
    title: disease.canonicalName,
    context: disease.snippet,
    href: `/conditions/${disease.slug}`,
    reviewedAt: disease.reviewedAt,
    icon: disease.icon,
  }));

  return NextResponse.json({ items });
}
