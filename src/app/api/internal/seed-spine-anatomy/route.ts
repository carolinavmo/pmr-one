import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import blocks from "./blocks.json";

// TEMPORARY seed route — imports the Spine Anatomy teaching chapter
// from the founder's docx, following the same pipeline already used
// for Elbow/Knee/Hip/Ankle/Ankle-and-Foot Anatomy this session.
// Idempotent (checks for the slug first). Remove after use.

type Block =
  | { type: "section_heading" | "subsection_heading" | "subsubsection_heading"; text: string }
  | { type: "paragraph"; body: string }
  | { type: "highlight_card"; label: string; text: string; color: string }
  | { type: "comparison_table"; columns: string[]; rows: string[][] };

function contentConfigFor(block: Block): Record<string, unknown> {
  switch (block.type) {
    case "section_heading":
    case "subsection_heading":
    case "subsubsection_heading":
      return { text: block.text };
    case "paragraph":
      return { body: block.body };
    case "highlight_card":
      return { label: block.label, text: block.text, color: block.color };
    case "comparison_table":
      return { columns: block.columns, rows: block.rows };
  }
}

export async function GET() {
  const existing = await pool.query(`SELECT id FROM disease WHERE slug = $1`, ["spine-anatomy"]);
  if (existing.rows.length > 0) {
    return NextResponse.json({ ok: false, error: "spine-anatomy already exists", id: existing.rows[0].id });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const diseaseId = randomUUID();
    await client.query(
      `INSERT INTO disease (id, slug, canonical_name, status, evidence_based, source_locale, topic_id)
       VALUES ($1, $2, $3, 'published', true, 'en', (SELECT topic_id FROM disease WHERE slug = 'elbow-anatomy'))`,
      [diseaseId, "spine-anatomy", "Spine Anatomy"]
    );

    let position = 0;
    for (const block of blocks as Block[]) {
      await client.query(
        `INSERT INTO editorial_block (id, disease_id, position, block_type, content_config, source_locale)
         VALUES ($1, $2, $3, $4, $5, 'en')`,
        [randomUUID(), diseaseId, position, block.type, JSON.stringify(contentConfigFor(block))]
      );
      position += 1;
    }

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, diseaseId, blockCount: blocks.length });
  } catch (err) {
    await client.query("ROLLBACK");
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
