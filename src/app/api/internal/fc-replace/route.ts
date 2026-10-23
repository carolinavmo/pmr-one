import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { pool } from "@/lib/db";
import { sanitizeRichText } from "@/lib/rich-text";
import cardsJson from "./cards.json";

// TEMPORARY — replaces every card in the "Rotator cuff tendinopathy" deck of the
// "Shoulder" flashcard folder with the cards from
// rotator-cuff-tendinopathy-flashcards (2).md (cards.json next to this file).
// The deck itself (name, folder, status, link to the page) is left as it is. The
// old cards are deleted; if any reader has study progress on them the run is
// refused unless {force:true}. Skipped when the deck already holds the new set.
// POST {dryRun:true} reports the plan without writing. Remove once run.

const FOLDER = "Shoulder";
const DECK = "Rotator cuff tendinopathy";

interface CardIn {
  section: string;
  q: string;
  a: string;
}
const CARDS = cardsJson as CardIn[];

export async function POST(req: NextRequest) {
  const { dryRun, force } = (await req.json().catch(() => ({}))) as { dryRun?: boolean; force?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: decks } = await client.query<{ id: string; status: string }>(
      `SELECT d.id, d.status FROM flashcard_deck d JOIN flashcard_category c ON c.id = d.category_id
       WHERE d.owner_type = 'system' AND lower(c.name) = lower($1) AND lower(d.name) = lower($2)`,
      [FOLDER, DECK]
    );
    if (decks.length !== 1) throw new Error(`expected one "${DECK}" deck in "${FOLDER}", found ${decks.length}`);
    const deck = decks[0];

    const { rows: old } = await client.query<{ id: string; question: string; deleted_at: string | null }>(
      `SELECT id, question, deleted_at FROM flashcard WHERE deck_id = $1 ORDER BY position`,
      [deck.id]
    );
    const live = old.filter((c) => !c.deleted_at);
    const newFirst = sanitizeRichText(CARDS[0].q);
    if (live.length === CARDS.length && live[0]?.question === newFirst) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "deck already holds the new cards", cards: live.length });
    }

    const ids = old.map((c) => c.id);
    const count = async (sql: string) => Number((await client.query<{ n: string }>(sql, [ids])).rows[0].n);
    const progress = {
      leitner: await count(`SELECT count(*) AS n FROM flashcard_progress WHERE flashcard_id = ANY($1::uuid[])`),
      sm2: await count(`SELECT count(*) AS n FROM flashcard_sm2_progress WHERE flashcard_id = ANY($1::uuid[])`),
      reviews: await count(`SELECT count(*) AS n FROM flashcard_review_log WHERE flashcard_id = ANY($1::uuid[])`),
    };
    const hasProgress = progress.leitner + progress.sm2 + progress.reviews > 0;

    const plan = {
      deckId: deck.id,
      deckStatus: deck.status,
      oldCards: live.length,
      newCards: CARDS.length,
      progress,
      firstNew: CARDS[0].q,
      lastNew: CARDS[CARDS.length - 1].q,
    };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }
    if (hasProgress && !force) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: false, error: "readers have study progress on the old cards; rerun with force to discard it", plan }, { status: 409 });
    }

    // hard delete when the database allows it, otherwise soft delete (hidden everywhere)
    let how = "deleted";
    await client.query("SAVEPOINT del");
    try {
      await client.query(`DELETE FROM flashcard WHERE deck_id = $1`, [deck.id]);
      await client.query("RELEASE SAVEPOINT del");
    } catch {
      await client.query("ROLLBACK TO SAVEPOINT del");
      await client.query(`UPDATE flashcard SET deleted_at = now(), status = 'draft' WHERE deck_id = $1 AND deleted_at IS NULL`, [deck.id]);
      how = "soft-deleted";
    }

    const { rows: pos } = await client.query<{ next: number }>(`SELECT COALESCE(MAX(position) + 1, 0)::int AS next FROM flashcard WHERE deck_id = $1`, [deck.id]);
    for (let i = 0; i < CARDS.length; i++) {
      await client.query(`INSERT INTO flashcard (deck_id, question, answer, position, status) VALUES ($1, $2, $3, $4, 'published')`, [
        deck.id,
        sanitizeRichText(CARDS[i].q),
        sanitizeRichText(CARDS[i].a),
        pos[0].next + i,
      ]);
    }
    await client.query("COMMIT");

    revalidatePath("/[locale]/flashcards", "page");
    revalidatePath("/[locale]/flashcards/[deckId]", "page");
    revalidatePath("/[locale]/admin/flashcards", "page");
    return NextResponse.json({ ok: true, replaced: { old: live.length, how, new: CARDS.length }, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
