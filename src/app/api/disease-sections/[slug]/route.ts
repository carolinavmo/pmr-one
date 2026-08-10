import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSectionIndex } from "@/lib/disease-loader";

// Backs IndexSidebar's per-disease section list — fetched client-side
// whenever the active disease slug (read from the URL) changes,
// rather than the server-rendered layout pre-fetching one fixed
// disease's sections on every single page load. `canReview` mirrors
// the same editor/admin gate topics.ts's `getTopicTree` and every
// disease page itself already apply, so a draft disease's section
// titles aren't exposed here to a visitor who couldn't see the page.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const session = await auth();
  const canReview = session?.user.role === "editor" || session?.user.role === "admin";
  const sectionIndex = await getSectionIndex(slug, canReview);
  return NextResponse.json({ sectionIndex });
}
