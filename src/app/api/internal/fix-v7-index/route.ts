import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { revalidateDiseaseSurfaces } from "@/lib/revalidation";

// Temporary, one-shot data-fix route — same pattern as the migration/
// seed routes (hardcoded, idempotent, no user input, deleted after it
// runs once). Several headings in Shoulder Anatomy V7 were stored as
// top-level section_heading even though they read as sub-items of the
// immediately preceding chapter/part (e.g. "2.3 The Proximal Humerus"
// sitting alongside "2.1"/"2.2", which are correctly subsection_heading),
// which made them wrongly appear in the "On this page" index. Demotes
// each one tier, cascading to its own children where that would
// otherwise collide with a sibling tier.
//
// Matched by heading TEXT, not position: the original seed-shoulder-
// anatomy-v7 route re-assigned fresh sequential positions (10, 20,
// 30...) during its INSERT loop rather than copying local dev's own
// organic position values (shifted many times over by makeRoomAfter/
// moveBlockAction across the session's authoring history) — so a
// position-keyed version of this fix silently matched zero rows in
// production while reporting success.

const demoteToSubsection = [
  "2.3 The Proximal Humerus",
  "3.3 The Glenohumeral Joint",
  "3.4 The Scapulothoracic Articulation",
  "3.5 The Subacromial–Subdeltoid Space and the Bursae",
  "5.2 Muscles — Group 2: Scapulohumeral (They Act Across the Glenohumeral Joint)",
  "5.3 Muscles — Group 3: Axiohumeral and Spanning Muscles",
  "The Axillary Nerve",
  "Other Nerves You Must Know Precisely",
  "24. Surface Anatomy and Palpation",
  "25. Ultrasound Anatomy",
  "26. Injection Anatomy",
  "27. Anatomical Variants — Consolidated",
  "28. Rapid Revision — Innervation and Root Levels",
  "29. Fifteen Pearls to Carry Into Clinic",
  "30. Self-Assessment",
];
const demoteToSubsubsection = [
  "Geometry",
  "Important landmarks",
  "Articular surfaces",
  "The joint capsule",
  "Normal anterosuperior labral variants",
  "Layers, deep to superficial",
];

export async function GET() {
  const d = await pool.query(`SELECT id FROM disease WHERE slug = 'shoulder-anatomy-v7'`);
  const diseaseId = d.rows[0]?.id as string | undefined;
  if (!diseaseId) {
    return NextResponse.json({ ok: false, error: "shoulder-anatomy-v7 not found" }, { status: 404 });
  }

  const results: { text: string; toType: string; matched: number }[] = [];

  for (const text of demoteToSubsection) {
    const r = await pool.query(
      `UPDATE editorial_block SET block_type = 'subsection_heading'
       WHERE disease_id = $1 AND block_type = 'section_heading' AND content_config->>'text' = $2`,
      [diseaseId, text]
    );
    results.push({ text, toType: "subsection_heading", matched: r.rowCount ?? 0 });
  }
  for (const text of demoteToSubsubsection) {
    const r = await pool.query(
      `UPDATE editorial_block SET block_type = 'subsubsection_heading'
       WHERE disease_id = $1 AND block_type = 'subsection_heading' AND content_config->>'text' = $2`,
      [diseaseId, text]
    );
    results.push({ text, toType: "subsubsection_heading", matched: r.rowCount ?? 0 });
  }

  revalidateDiseaseSurfaces();
  return NextResponse.json({ ok: true, diseaseId, results });
}
