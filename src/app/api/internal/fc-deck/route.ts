import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { pool } from "@/lib/db";
import { sanitizeRichText } from "@/lib/rich-text";
import { pickFreeTopicColor, type TopicColor } from "@/lib/flashcard-topic-colors";
import cardsJson from "./cards.json";

// TEMPORARY — creates the "Shoulder" flashcard folder (under the
// Musculoskeletal subject) and the "Rotator cuff tendinopathy" deck inside it,
// with every card from rotator-cuff-tendinopathy-flashcards.md (cards.json next
// to this file). The folder is reused if it already exists. The deck starts as
// a draft (like every admin-created deck) with its cards already published, so
// one "Publish deck" click in /admin/flashcards makes it live. Linked to the
// Rotator cuff tendinopathy page through source_disease_id when that page can
// be found. Skipped if the deck already exists in the folder. POST
// {dryRun:true} reports the plan without writing. Remove this route once run.

const FOLDER = "Shoulder";
const DECK = "Rotator cuff tendinopathy";
const SUBJECT = "Musculoskeletal";

interface CardIn {
  section: string;
  q: string;
  a: string;
}
const CARDS = cardsJson as CardIn[];

export async function POST(req: NextRequest) {
  const { dryRun } = (await req.json().catch(() => ({}))) as { dryRun?: boolean };
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows: subjects } = await client.query<{ id: string; name: string }>(
      `SELECT id, name FROM flashcard_subject ORDER BY position, name`
    );
    const subject = subjects.find((s) => s.name.toLowerCase() === SUBJECT.toLowerCase()) ?? subjects[0];
    if (!subject) throw new Error("no flashcard subjects exist");

    const { rows: cats } = await client.query<{ id: string; name: string; subject_id: string; topic_color: string | null }>(
      `SELECT id, name, subject_id, topic_color FROM flashcard_category WHERE owner_type = 'system' ORDER BY position, name`
    );
    const existingFolder = cats.find((c) => c.name.trim().toLowerCase() === FOLDER.toLowerCase());

    let existingDeck: { id: string; status: string } | undefined;
    if (existingFolder) {
      const { rows } = await client.query<{ id: string; status: string }>(
        `SELECT id, status FROM flashcard_deck WHERE owner_type = 'system' AND category_id = $1 AND lower(name) = lower($2)`,
        [existingFolder.id, DECK]
      );
      existingDeck = rows[0];
    }
    if (existingDeck) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, skipped: "deck already exists in the folder", existingDeck });
    }

    const { rows: pages } = await client.query<{ id: string; slug: string }>(
      `SELECT d.id, d.slug FROM disease d JOIN topic t ON t.id = d.topic_id WHERE t.name = 'Shoulder' AND lower(d.canonical_name) = 'rotator cuff tendinopathy'`
    );
    const sourcePage = pages.length === 1 ? pages[0] : null;

    const plan = {
      subject,
      subjectsAvailable: subjects.map((s) => s.name),
      existingFolders: cats.map((c) => c.name),
      folder: existingFolder ? `reuse "${existingFolder.name}"` : `create "${FOLDER}"`,
      deck: DECK,
      cards: CARDS.length,
      linkedPage: sourcePage?.slug ?? null,
      first: CARDS[0].q,
      last: CARDS[CARDS.length - 1].q,
    };
    if (dryRun) {
      await client.query("ROLLBACK");
      return NextResponse.json({ ok: true, dryRun: true, plan });
    }

    let folderId = existingFolder?.id;
    if (!folderId) {
      const topicColor = pickFreeTopicColor(cats.map((c) => c.topic_color as TopicColor | null));
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO flashcard_category (owner_type, user_id, name, color, topic_color, subject_id, position)
         VALUES ('system', NULL, $1, 'neutral', $2, $3, $4) RETURNING id`,
        [FOLDER, topicColor, subject.id, cats.length]
      );
      folderId = rows[0].id;
    }

    const { rows: deckCount } = await client.query<{ count: number }>(`SELECT COUNT(*)::int AS count FROM flashcard_deck WHERE owner_type = 'system'`);
    const { rows: deckRows } = await client.query<{ id: string }>(
      `INSERT INTO flashcard_deck (owner_type, name, description, color, category_id, source_disease_id, position, status)
       VALUES ('system', $1, $2, 'neutral', $3, $4, $5, 'draft') RETURNING id`,
      [DECK, "Key facts from the Rotator cuff tendinopathy chapter, in chapter order.", folderId, sourcePage?.id ?? null, deckCount[0].count]
    );
    const deckId = deckRows[0].id;

    for (let i = 0; i < CARDS.length; i++) {
      await client.query(`INSERT INTO flashcard (deck_id, question, answer, position, status) VALUES ($1, $2, $3, $4, 'published')`, [
        deckId,
        sanitizeRichText(CARDS[i].q),
        sanitizeRichText(CARDS[i].a),
        i,
      ]);
    }
    await client.query("COMMIT");

    // updateTag (what the server actions use) is Server-Action-only.
    revalidateTag("library-tree", { expire: 0 });
    revalidatePath("/[locale]/flashcards", "page");
    revalidatePath("/[locale]/admin/flashcards", "page");
    return NextResponse.json({ ok: true, created: { folderId, deckId, cards: CARDS.length }, plan });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  } finally {
    client.release();
  }
}
