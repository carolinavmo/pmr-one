import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { getReadingProgress } from "@/lib/workspace";

// Backs IndexSidebar's reading-state restore (SIDEBAR-BAND-SPEC.md
// rule 5: "on return, restore the read states and drop the reader at
// the section they left") — fetched client-side once the active
// disease slug is known, same pattern as /api/disease-sections/[slug].
// Signed-out visitors never hit this route at all (IndexSidebar reads
// localStorage instead); a signed-in reader with no saved progress yet
// just gets `progress: null`, same as a first read.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ progress: null });

  const { rows } = await pool.query(`SELECT id FROM disease WHERE slug = $1`, [slug]);
  const diseaseId = rows[0]?.id as string | undefined;
  if (!diseaseId) return NextResponse.json({ progress: null });

  const progress = await getReadingProgress(session.user.id, diseaseId);
  return NextResponse.json({ progress });
}
