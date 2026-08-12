import { NextResponse } from "next/server";
import { getPublishedDiseases } from "@/lib/disease-catalog";
import { getAllCalculators } from "@/lib/clinical-tools";
import type { SearchableItem } from "@/components/ui/SearchExperience";

// No query params — the catalog is small enough (a handful of
// diseases and calculators) that filtering happens client-side in
// SearchExperience; this route's only job is to return everything
// searchable once per command-palette open, not to rank or paginate.
// Neither source is locale-resolved here (matches the pre-existing
// disease behavior) — the search index is English-only regardless of
// the visitor's locale.
export async function GET() {
  const [diseases, calculators] = await Promise.all([
    getPublishedDiseases(),
    getAllCalculators("en"),
  ]);

  const items: SearchableItem[] = [
    ...diseases.map((disease) => ({
      id: disease.id,
      type: "disease" as const,
      title: disease.canonicalName,
      context: disease.snippet,
      href: `/conditions/${disease.slug}`,
      reviewedAt: disease.reviewedAt,
      icon: disease.icon,
    })),
    ...calculators.map((calculator) => ({
      id: calculator.id,
      type: "clinical_calculator" as const,
      title: calculator.abbreviation
        ? `${calculator.name} (${calculator.abbreviation})`
        : calculator.name,
      context: calculator.description,
      href: `/clinical-tools/${calculator.slug}`,
    })),
  ];

  return NextResponse.json({ items });
}
