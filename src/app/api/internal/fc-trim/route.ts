import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";

// TEMPORARY — removes eight overlapping cards from the "Rotator cuff
// tendinopathy" deck of the "Shoulder" flashcard folder (1 in Biomechanics, 7 in
// Rehabilitation) and renumbers the rest. Cards are matched by their exact
// question text. Skipped when none of them are left. POST {dryRun:true}
// reports what would be removed without writing; a card that has study
// progress is only removed with {force:true}. Remove this route once run.

const FOLDER = "Shoulder";
const DECK = "Rotator cuff tendinopathy";
const REMOVE = [
  // Biomechanics
  "How much superior translation occurs during normal elevation?",
  // Rehabilitation
  "Which exercise type is superior for rotator cuff related shoulder pain?",
  "Given that evidence, what is the honest reason to use isometrics?",
  "How do you progress within stage 1 before moving on?",
  "How do you set the starting load?",
  "What is the commonest failure of a cuff programme, and what question exposes it?",
  "Why ask the patient to record their load?",
  "When should a programme be regressed?",
];

const plain = (h: string) => h.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

export async function POST(req: NextRequest) {
  const { dryRun, force } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; force?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: decks } = await client.query<{ id: string }>(
      `SELECT d.id FROM flashcard_deck d JOIN flashcard_category c ON c.id = d.category_id
       WHERE d.owner_type = 'system' AND lower(c.name) = lower($1) AND lower(d.name) = lower($2)`,
      [FOLDER, DECK]
    );
    if (decks.length !== 1) throw new Error(`expected one "${DECK}" deck in "${FOLDER}", found ${decks.length}`);
    const deckId = decks[0].id;

    const { rows: cards } = await client.query<{ id: string; question: string; position: number }>(
      `SELECT id, question, position FROM flashcard WHERE deck_id = $1 AND deleted_at IS NULL ORDER BY position FOR UPDATE`,
      [deckId]
    );
    const wanted = new Set(REMOVE.map(plain));
    const hits = cards.filter((c) => wanted.has(plain(c.question)));
    const missing = REMOVE.filter((q) => !hits.some((h) => plain(h.question) === plain(q)));
    if (hits.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "none of the cards are in the deck any more", total: cards.length });
    }

    const ids = hits.map((h) => h.id);
    const { rows: prog } = await client.query<{ n: string }>(
      `SELECT (SELECT count(*) FROM flashcard_sm2_progress WHERE flashcard_id = ANY($1::uuid[]))
            + (SELECT count(*) FROM flashcard_progress WHERE flashcard_id = ANY($1::uuid[]))
            + (SELECT count(*) FROM flashcard_review_log WHERE flashcard_id = ANY($1::uuid[])) AS n`,
      [ids]
    );
    const progress = Number(prog[0].n);
    const plan = { deckId, totalBefore: cards.length, totalAfter: cards.length - hits.length, remove: hits.map((h) => `${h.position}: ${plain(h.question)}`), notFound: missing, progressOnThem: progress };

    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }
    if (progress > 0 && !force) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "readers have study progress on some of these cards; rerun with force to discard it", plan }, { status: 409 });
    }

    await client.query(`DELETE FROM flashcard WHERE id = ANY($1::uuid[])`, [ids]);
    // renumber what is left so positions stay 0..n-1 in the same order
    await client.query(
      `UPDATE flashcard f SET position = r.rn FROM (
         SELECT id, (row_number() OVER (ORDER BY position, created_at) - 1)::int AS rn FROM flashcard WHERE deck_id = $1 AND deleted_at IS NULL
       ) r WHERE f.id = r.id`,
      [deckId]
    );
    await client.query("COMMIT");

    revalidatePath("/[locale]/flashcards", "page");
    revalidatePath("/[locale]/flashcards/[deckId]", "page");
    revalidatePath("/[locale]/admin/flashcards", "page");
    return NextResponse.json({ ok: true, removed: hits.length, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
