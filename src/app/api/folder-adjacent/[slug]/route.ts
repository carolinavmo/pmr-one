import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getFolderAdjacentDiseases } from "@/lib/topics";

// Backs the reading rail's "next in this folder" card (SIDEBAR-BAND-
// SPEC.md / sidebar-reading.html) — the exact same folder-scoped
// lookup EndOfPageBar already uses server-side, just reachable
// client-side since IndexSidebar is a persistent layout component with
// no server-rendered per-disease props. `canReview` mirrors every
// other disease-scoped route's editor/admin gate.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const folderAdjacent = await getFolderAdjacentDiseases(slug, canReview);
  return NextResponse.json({ folderAdjacent });
}
