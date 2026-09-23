import { getPublishedDiseases, type DiseaseCatalogEntry } from "@/lib/disease-catalog";

// AtlasLibraryLinkPicker.tsx's "Link to a library page" search — the
// catalog is a few hundred rows at most, not worth a dedicated
// full-text query.
export async function searchLibraryPages(query: string, limit = 20): Promise<DiseaseCatalogEntry[]> {
  const all = await getPublishedDiseases();
  const q = query.trim().toLowerCase();
  if (!q) return all.slice(0, limit);
  return all.filter((d) => d.canonicalName.toLowerCase().includes(q)).slice(0, limit);
}
