import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import { nextBox, computeDueAt, MASTERY_BOX } from "@/lib/flashcard-scoring";
import { iconForRegions, categoryForRegions } from "@/lib/disease-icons";
import type { CardIconName } from "@/components/ui/cardIcons";

// Preset ("system") decks + member-created ("user") decks, sharing one
// table set — see db/migrations/0041_flashcards.sql for why this is a
// standalone schema rather than a 15th KnowledgeObjectType. Same
// pool.query / no-ORM / ownership-checked-in-SQL style as atlas.ts.

export type DeckOwnerType = "system" | "user";

export interface DeckSummary {
  id: string;
  ownerType: DeckOwnerType;
  name: string;
  description: string;
  color: CardColor;
  cardCount: number;
  masteredCount: number | null; // null when there's no session to score against
  icon: CardIconName | undefined; // region-derived from the source disease's illustrations; undefined for user decks (no disease link)
  topicLabel: string | undefined; // ditto — the same region label used elsewhere (e.g. /conditions cards)
}

export interface FlashcardCard {
  id: string;
  question: string;
  answer: string;
  position: number;
  box: number | null; // null when there's no session (never reviewed / anonymous)
  dueAt: string | null;
}

export interface DeckDetail {
  id: string;
  ownerType: DeckOwnerType;
  name: string;
  description: string;
  color: CardColor;
  sourceDiseaseName: string | null;
  sourceDiseaseSlug: string | null;
  cards: FlashcardCard[];
}

function mapDeckSummaryRow(r: {
  id: string;
  owner_type: DeckOwnerType;
  name: string;
  description: string;
  color: CardColor;
  card_count: string;
  mastered_count: string | null;
  regions: (string | null)[] | null;
}): DeckSummary {
  return {
    id: r.id,
    ownerType: r.owner_type,
    name: r.name,
    description: r.description,
    color: r.color,
    cardCount: Number(r.card_count),
    masteredCount: r.mastered_count === null ? null : Number(r.mastered_count),
    icon: iconForRegions(r.regions ?? []),
    topicLabel: categoryForRegions(r.regions ?? []),
  };
}

export async function getDeckSummaries(
  userId: string | null
): Promise<{ presetDecks: DeckSummary[]; userDecks: DeckSummary[] }> {
  const masteredSelect = userId
    ? `, (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count`
    : `, NULL::bigint AS mastered_count`;

  const { rows: presetRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id) AS card_count,
       (
         SELECT array_agg(DISTINCT a.region)
         FROM illustration_usage iu
         JOIN illustration_depicts_anatomy ida ON ida.medical_illustration_id = iu.medical_illustration_id
         JOIN anatomy_structure a ON a.id = ida.anatomy_structure_id
         WHERE iu.target_type = 'disease' AND iu.target_id = d.source_disease_id
       ) AS regions
       ${masteredSelect}
     FROM flashcard_deck d
     WHERE d.owner_type = 'system'
     ORDER BY d.position, d.name`,
    userId ? [userId] : []
  );

  if (!userId) {
    return { presetDecks: presetRows.map(mapDeckSummaryRow), userDecks: [] };
  }

  const { rows: userRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id) AS card_count,
       NULL::text[] AS regions,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count
     FROM flashcard_deck d
     WHERE d.owner_type = 'user' AND d.user_id = $1
     ORDER BY d.position, d.created_at`,
    [userId]
  );

  return {
    presetDecks: presetRows.map(mapDeckSummaryRow),
    userDecks: userRows.map(mapDeckSummaryRow),
  };
}

export async function getDeckWithCards(
  deckId: string,
  userId: string | null
): Promise<DeckDetail | null> {
  const { rows: deckRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color,
       dis.canonical_name AS source_disease_name, dis.slug AS source_disease_slug
     FROM flashcard_deck d
     LEFT JOIN disease dis ON dis.id = d.source_disease_id
     WHERE d.id = $1`,
    [deckId]
  );
  const deck = deckRows[0];
  if (!deck) return null;

  const { rows: ownerCheckRows } =
    deck.owner_type === "user"
      ? await pool.query(`SELECT 1 FROM flashcard_deck WHERE id = $1 AND user_id = $2`, [
          deckId,
          userId,
        ])
      : { rows: [{ ok: true }] };
  if (ownerCheckRows.length === 0) return null;

  const { rows: cardRows } = await pool.query(
    userId
      ? `SELECT f.id, f.question, f.answer, f.position, p.box, p.due_at
         FROM flashcard f
         LEFT JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $2
         WHERE f.deck_id = $1
         ORDER BY f.position, f.created_at`
      : `SELECT f.id, f.question, f.answer, f.position, NULL::int AS box, NULL::date AS due_at
         FROM flashcard f
         WHERE f.deck_id = $1
         ORDER BY f.position, f.created_at`,
    userId ? [deckId, userId] : [deckId]
  );

  return {
    id: deck.id,
    ownerType: deck.owner_type,
    name: deck.name,
    description: deck.description,
    color: deck.color,
    sourceDiseaseName: deck.source_disease_name,
    sourceDiseaseSlug: deck.source_disease_slug,
    cards: cardRows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      position: r.position,
      box: r.box === null ? null : Number(r.box),
      dueAt: r.due_at,
    })),
  };
}

export async function createDeck(userId: string, name: string, color: CardColor): Promise<DeckSummary> {
  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM flashcard_deck WHERE owner_type = 'user' AND user_id = $1`,
    [userId]
  );
  const { rows } = await pool.query(
    `INSERT INTO flashcard_deck (owner_type, user_id, name, color, position)
     VALUES ('user', $1, $2, $3, $4)
     RETURNING id, owner_type, name, description, color`,
    [userId, name, color, countRows[0].count]
  );
  return { ...mapDeckSummaryRow({ ...rows[0], card_count: "0", mastered_count: "0" }) };
}

export async function renameDeck(userId: string, deckId: string, name: string): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET name = $1 WHERE id = $2 AND owner_type = 'user' AND user_id = $3`,
    [name, deckId, userId]
  );
}

export async function updateDeckColor(userId: string, deckId: string, color: CardColor): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET color = $1 WHERE id = $2 AND owner_type = 'user' AND user_id = $3`,
    [color, deckId, userId]
  );
}

export async function deleteDeck(userId: string, deckId: string): Promise<void> {
  await pool.query(`DELETE FROM flashcard_deck WHERE id = $1 AND owner_type = 'user' AND user_id = $2`, [
    deckId,
    userId,
  ]);
}

export async function reorderDecks(userId: string, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE flashcard_deck SET position = $1 WHERE id = $2 AND owner_type = 'user' AND user_id = $3`,
      [i, orderedIds[i], userId]
    );
  }
}

export async function createCard(
  userId: string,
  deckId: string,
  question: string,
  answer: string
): Promise<FlashcardCard | null> {
  const { rows } = await pool.query(
    `INSERT INTO flashcard (deck_id, question, answer, position)
     SELECT $2, $3, $4, COALESCE((SELECT COUNT(*) FROM flashcard WHERE deck_id = $2), 0)
     WHERE EXISTS (SELECT 1 FROM flashcard_deck WHERE id = $2 AND owner_type = 'user' AND user_id = $1)
     RETURNING id, question, answer, position`,
    [userId, deckId, question, answer]
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, question: row.question, answer: row.answer, position: row.position, box: null, dueAt: null };
}

export async function updateCard(
  userId: string,
  cardId: string,
  question: string,
  answer: string
): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET question = $1, answer = $2
     FROM flashcard_deck d
     WHERE f.id = $3 AND f.deck_id = d.id AND d.owner_type = 'user' AND d.user_id = $4`,
    [question, answer, cardId, userId]
  );
}

export async function deleteCard(userId: string, cardId: string): Promise<void> {
  await pool.query(
    `DELETE FROM flashcard f
     USING flashcard_deck d
     WHERE f.id = $1 AND f.deck_id = d.id AND d.owner_type = 'user' AND d.user_id = $2`,
    [cardId, userId]
  );
}

// Ownership is verified once up front rather than per-row in the loop
// (same shape as atlas.ts's reorderPages, scoped by section_id there)
// — every subsequent UPDATE is additionally scoped by deck_id, so a
// forged id from a different deck simply doesn't match any row.
export async function reorderCards(userId: string, deckId: string, orderedIds: string[]): Promise<void> {
  const { rows } = await pool.query(
    `SELECT 1 FROM flashcard_deck WHERE id = $1 AND owner_type = 'user' AND user_id = $2`,
    [deckId, userId]
  );
  if (rows.length === 0) return;
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE flashcard SET position = $1 WHERE id = $2 AND deck_id = $3`, [
      i,
      orderedIds[i],
      deckId,
    ]);
  }
}

export async function recordReview(
  userId: string,
  flashcardId: string,
  knew: boolean
): Promise<{ box: number; dueAt: string }> {
  const { rows } = await pool.query(
    `SELECT box FROM flashcard_progress WHERE user_id = $1 AND flashcard_id = $2`,
    [userId, flashcardId]
  );
  const currentBox = rows[0] ? Number(rows[0].box) : 1;
  const box = nextBox(currentBox, knew);
  const dueAt = computeDueAt(box);

  await pool.query(
    `INSERT INTO flashcard_progress (user_id, flashcard_id, box, due_at, last_reviewed_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (user_id, flashcard_id)
     DO UPDATE SET box = $3, due_at = $4, last_reviewed_at = now()`,
    [userId, flashcardId, box, dueAt]
  );

  return { box, dueAt };
}

// Mirrors clinical_calculator_favorite / getFavoritedCalculatorIds
// exactly (workspace.ts) — a personal star toggle, unrelated to deck
// ownership, so it works the same for a preset deck or a user's own.
export async function getFavoritedDeckIds(userId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT deck_id FROM flashcard_deck_favorite WHERE user_id = $1`,
    [userId]
  );
  return new Set(rows.map((r) => r.deck_id as string));
}

export async function toggleDeckFavorite(userId: string, deckId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `DELETE FROM flashcard_deck_favorite WHERE user_id = $1 AND deck_id = $2 RETURNING 1`,
    [userId, deckId]
  );
  if (rows.length > 0) return false;

  await pool.query(`INSERT INTO flashcard_deck_favorite (user_id, deck_id) VALUES ($1, $2)`, [
    userId,
    deckId,
  ]);
  return true;
}
