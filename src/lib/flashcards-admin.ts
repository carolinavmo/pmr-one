import { pool } from "@/lib/db";
import { sanitizeRichText } from "@/lib/rich-text";
import { type TopicColor, isTopicColor } from "@/lib/flashcard-topic-colors";

// ============================================================
// The editor side — FLASHCARDS-IMPLEMENTATION.md Pass 5-6.
// Scoped to SYSTEM decks/cards only: a member's own deck has no
// draft/published concept (it's live the moment they save it, same as
// before this pass) — only library content, which every reader shares,
// goes through review before it's visible.
// ============================================================

export interface AdminDeckRow {
  id: string;
  name: string;
  status: "draft" | "published";
  cardCount: number;
  publishedCardCount: number;
  categoryId: string | null;
  categoryName: string | null;
  topicColor: TopicColor | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  sourceDiseaseName: string | null;
  archivedAt: string | null;
  position: number;
}

export async function getAdminDeckList(): Promise<AdminDeckRow[]> {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.status, d.archived_at, d.reviewed_at, d.position,
       d.category_id, c.name AS category_name, c.topic_color,
       u.name AS reviewed_by_name,
       dis.canonical_name AS source_disease_name,
       COUNT(f.id) FILTER (WHERE f.deleted_at IS NULL)::int AS card_count,
       COUNT(f.id) FILTER (WHERE f.deleted_at IS NULL AND f.status = 'published')::int AS published_card_count
     FROM flashcard_deck d
     LEFT JOIN flashcard_category c ON c.id = d.category_id
     LEFT JOIN users u ON u.id = d.reviewed_by
     LEFT JOIN disease dis ON dis.id = d.source_disease_id
     LEFT JOIN flashcard f ON f.deck_id = d.id
     WHERE d.owner_type = 'system'
     GROUP BY d.id, c.name, c.topic_color, c.position, u.name, dis.canonical_name
     ORDER BY c.position NULLS LAST, c.name NULLS LAST, d.position, d.name`
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    status: r.status,
    cardCount: r.card_count,
    publishedCardCount: r.published_card_count,
    categoryId: r.category_id,
    categoryName: r.category_name,
    topicColor: isTopicColor(r.topic_color) ? r.topic_color : null,
    reviewedAt: r.reviewed_at,
    reviewedByName: r.reviewed_by_name,
    sourceDiseaseName: r.source_disease_name,
    archivedAt: r.archived_at,
    position: r.position,
  }));
}

export interface AdminCardRow {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  status: "draft" | "published";
  position: number;
  contentVersion: number;
  contentUpdatedAt: string | null;
}

export interface AdminDeckDetail {
  id: string;
  name: string;
  description: string;
  status: "draft" | "published";
  categoryId: string | null;
  sourceDiseaseId: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  archivedAt: string | null;
}

export async function getAdminDeckDetail(deckId: string): Promise<{ deck: AdminDeckDetail; cards: AdminCardRow[] } | null> {
  const { rows: deckRows } = await pool.query(
    `SELECT d.id, d.name, d.description, d.status, d.category_id, d.source_disease_id, d.archived_at,
       d.reviewed_at, u.name AS reviewed_by_name
     FROM flashcard_deck d
     LEFT JOIN users u ON u.id = d.reviewed_by
     WHERE d.id = $1 AND d.owner_type = 'system'`,
    [deckId]
  );
  const deckRow = deckRows[0];
  if (!deckRow) return null;

  const { rows: cardRows } = await pool.query(
    `SELECT id, deck_id, question, answer, status, position, content_version, content_updated_at
     FROM flashcard WHERE deck_id = $1 AND deleted_at IS NULL
     ORDER BY position, created_at`,
    [deckId]
  );

  return {
    deck: {
      id: deckRow.id,
      name: deckRow.name,
      description: deckRow.description ?? "",
      status: deckRow.status,
      categoryId: deckRow.category_id,
      sourceDiseaseId: deckRow.source_disease_id,
      reviewedAt: deckRow.reviewed_at,
      reviewedByName: deckRow.reviewed_by_name,
      archivedAt: deckRow.archived_at,
    },
    cards: cardRows.map((r) => ({
      id: r.id,
      deckId: r.deck_id,
      question: r.question,
      answer: r.answer,
      status: r.status,
      position: r.position,
      contentVersion: r.content_version,
      contentUpdatedAt: r.content_updated_at,
    })),
  };
}

export async function createAdminDeck(name: string, categoryId: string | null): Promise<string> {
  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM flashcard_deck WHERE owner_type = 'system'`);
  const { rows } = await pool.query(
    `INSERT INTO flashcard_deck (owner_type, name, color, category_id, position, status)
     VALUES ('system', $1, 'neutral', $2, $3, 'draft')
     RETURNING id`,
    [name.trim() || "Untitled deck", categoryId, countRows[0].count]
  );
  return rows[0].id;
}

export async function updateAdminDeckMeta(
  deckId: string,
  { name, description, categoryId }: { name: string; description: string; categoryId: string | null }
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET name = $1, description = $2, category_id = $3
     WHERE id = $4 AND owner_type = 'system'`,
    [name.trim() || "Untitled deck", description, categoryId, deckId]
  );
}

// "A deck cannot be published with zero published cards"
// (FLASHCARDS-IMPLEMENTATION.md Pass 5). Returns a reason string when
// refused so the UI can say why, rather than a silent no-op.
export async function publishAdminDeck(deckId: string, reviewerId: string): Promise<{ ok: boolean; reason?: "no-published-cards" }> {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS count FROM flashcard WHERE deck_id = $1 AND status = 'published' AND deleted_at IS NULL`,
    [deckId]
  );
  if (Number(rows[0].count) === 0) return { ok: false, reason: "no-published-cards" };

  await pool.query(
    `UPDATE flashcard_deck SET status = 'published', reviewed_at = now(), reviewed_by = $2
     WHERE id = $1 AND owner_type = 'system'`,
    [deckId, reviewerId]
  );
  return { ok: true };
}

export async function unpublishAdminDeck(deckId: string): Promise<void> {
  await pool.query(`UPDATE flashcard_deck SET status = 'draft' WHERE id = $1 AND owner_type = 'system'`, [deckId]);
}

export async function archiveAdminDeck(deckId: string): Promise<void> {
  await pool.query(`UPDATE flashcard_deck SET archived_at = now() WHERE id = $1 AND owner_type = 'system'`, [deckId]);
}

export async function unarchiveAdminDeck(deckId: string): Promise<void> {
  await pool.query(`UPDATE flashcard_deck SET archived_at = NULL WHERE id = $1 AND owner_type = 'system'`, [deckId]);
}

// Same shape as the source deck, cards included, both starting over as
// drafts — "duplicate" is a starting point for a variant, never a
// silent second copy of already-published content.
export async function duplicateAdminDeck(deckId: string): Promise<string | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: deckRows } = await client.query(
      `SELECT name, description, color, category_id, source_disease_id, position
       FROM flashcard_deck WHERE id = $1 AND owner_type = 'system'`,
      [deckId]
    );
    const source = deckRows[0];
    if (!source) {
      await client.query("ROLLBACK");
      return null;
    }
    const { rows: countRows } = await client.query(`SELECT COUNT(*)::int AS count FROM flashcard_deck WHERE owner_type = 'system'`);
    const { rows: newDeckRows } = await client.query(
      `INSERT INTO flashcard_deck (owner_type, name, description, color, category_id, source_disease_id, position, status)
       VALUES ('system', $1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id`,
      [`${source.name} copy`, source.description, source.color, source.category_id, source.source_disease_id, countRows[0].count]
    );
    const newDeckId = newDeckRows[0].id;

    const { rows: cardRows } = await client.query(
      `SELECT question, answer, position FROM flashcard WHERE deck_id = $1 AND deleted_at IS NULL ORDER BY position`,
      [deckId]
    );
    for (const card of cardRows) {
      await client.query(
        `INSERT INTO flashcard (deck_id, question, answer, position, status) VALUES ($1, $2, $3, $4, 'draft')`,
        [newDeckId, card.question, card.answer, card.position]
      );
    }
    await client.query("COMMIT");
    return newDeckId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function reorderAdminDecks(categoryId: string | null, orderedIds: string[]): Promise<void> {
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(
      `UPDATE flashcard_deck SET position = $1 WHERE id = $2 AND owner_type = 'system' AND category_id IS NOT DISTINCT FROM $3`,
      [i, orderedIds[i], categoryId]
    );
  }
}

// ---------- Cards ----------

export async function createAdminCard(deckId: string, question: string, answer: string): Promise<string | null> {
  const { rows } = await pool.query(
    `INSERT INTO flashcard (deck_id, question, answer, position, status)
     SELECT $1, $2, $3, COALESCE((SELECT COUNT(*) FROM flashcard WHERE deck_id = $1), 0), 'draft'
     WHERE EXISTS (SELECT 1 FROM flashcard_deck WHERE id = $1 AND owner_type = 'system')
     RETURNING id`,
    [deckId, sanitizeRichText(question), sanitizeRichText(answer)]
  );
  return rows[0]?.id ?? null;
}

// Routine autosave (RichEditableText commits per field, on blur) — a
// typo fix, a rewording, formatting. Bumps content_version so nothing
// is silently lost, but "a typo fix must not reset anyone's progress"
// (FLASHCARDS-IMPLEMENTATION.md Pass 6), so this alone never touches
// flashcard_sm2_progress. flagCardAnswerChanged, below, is the
// separate, deliberate action for a real content change.
export async function updateAdminCard(cardId: string, { question, answer }: { question: string; answer: string }): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET question = $1, answer = $2, updated_at = now(), content_version = content_version + 1
     FROM flashcard_deck d
     WHERE f.id = $3 AND f.deck_id = d.id AND d.owner_type = 'system'`,
    [sanitizeRichText(question), sanitizeRichText(answer), cardId]
  );
}

// "This changes the answer" (FLASHCARDS-IMPLEMENTATION.md Pass 6) — a
// separate, deliberate action from the autosave above, called once an
// editor has already saved their edit and confirms it materially
// changes what the card teaches. Knocks every reviewer currently on
// this card back to "learning" (due immediately) and stamps
// content_updated_at so the reader sees an UPDATED chip for 14 days.
// Returns the blast radius actually affected, for the confirmation UI
// to report back ("12 people reset").
export async function flagCardAnswerChanged(cardId: string): Promise<{ resetCount: number }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE flashcard f SET content_updated_at = now(), content_version = content_version + 1
       FROM flashcard_deck d
       WHERE f.id = $1 AND f.deck_id = d.id AND d.owner_type = 'system'`,
      [cardId]
    );
    const { rows } = await client.query(
      `UPDATE flashcard_sm2_progress
       SET state = 'learning', interval_days = 0, repetitions = 0, due_at = now()
       WHERE flashcard_id = $1 AND state = 'review'
       RETURNING user_id`,
      [cardId]
    );
    await client.query("COMMIT");
    return { resetCount: rows.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function publishAdminCard(cardId: string): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET status = 'published' FROM flashcard_deck d
     WHERE f.id = $1 AND f.deck_id = d.id AND d.owner_type = 'system'`,
    [cardId]
  );
}

export async function unpublishAdminCard(cardId: string): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET status = 'draft' FROM flashcard_deck d
     WHERE f.id = $1 AND f.deck_id = d.id AND d.owner_type = 'system'`,
    [cardId]
  );
}

// Soft delete — "because the review log references it"
// (FLASHCARDS-IMPLEMENTATION.md Pass 5): a hard delete would orphan
// every review_log row for this card, erasing real study history.
export async function softDeleteAdminCard(cardId: string): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET deleted_at = now() FROM flashcard_deck d
     WHERE f.id = $1 AND f.deck_id = d.id AND d.owner_type = 'system'`,
    [cardId]
  );
}

export async function duplicateAdminCard(cardId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `INSERT INTO flashcard (deck_id, question, answer, position, status)
     SELECT deck_id, question, answer, (SELECT COUNT(*) FROM flashcard WHERE deck_id = f.deck_id), 'draft'
     FROM flashcard f
     JOIN flashcard_deck d ON d.id = f.deck_id AND d.owner_type = 'system'
     WHERE f.id = $1 AND f.deleted_at IS NULL
     RETURNING id`,
    [cardId]
  );
  return rows[0]?.id ?? null;
}

export async function reorderAdminCards(deckId: string, orderedIds: string[]): Promise<void> {
  const { rows } = await pool.query(`SELECT 1 FROM flashcard_deck WHERE id = $1 AND owner_type = 'system'`, [deckId]);
  if (rows.length === 0) return;
  for (let i = 0; i < orderedIds.length; i++) {
    await pool.query(`UPDATE flashcard SET position = $1 WHERE id = $2 AND deck_id = $3`, [i, orderedIds[i], deckId]);
  }
}

// "Show editors the blast radius before they save: '84 people have
// this card in review.'" (FLASHCARDS-IMPLEMENTATION.md Pass 6) — every
// reviewer currently on this card who would be knocked back to
// learning if "this changes the answer" is ticked.
export async function getCardBlastRadius(cardId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(DISTINCT user_id)::int AS count FROM flashcard_sm2_progress WHERE flashcard_id = $1 AND state = 'review'`,
    [cardId]
  );
  return Number(rows[0]?.count ?? 0);
}

// ============================================================
// Pass 7 — authoring tools that save hours
// ============================================================

// "Bulk import CSV/TSV (front, back, tags) with a preview table and a
// dry run." (FLASHCARDS-IMPLEMENTATION.md) — every row lands as a
// draft, same as a hand-typed new card; nothing is published without
// a human reviewing the import first.
export async function bulkImportCards(deckId: string, rows: { question: string; answer: string }[]): Promise<number> {
  const { rows: deckRows } = await pool.query(`SELECT 1 FROM flashcard_deck WHERE id = $1 AND owner_type = 'system'`, [deckId]);
  if (deckRows.length === 0) return 0;

  const { rows: countRows } = await pool.query(`SELECT COUNT(*)::int AS count FROM flashcard WHERE deck_id = $1`, [deckId]);
  let position = countRows[0].count;
  let created = 0;
  for (const row of rows) {
    if (!row.question.trim() || !row.answer.trim()) continue;
    await pool.query(`INSERT INTO flashcard (deck_id, question, answer, position, status) VALUES ($1, $2, $3, $4, 'draft')`, [
      deckId,
      sanitizeRichText(row.question),
      sanitizeRichText(row.answer),
      position,
    ]);
    position += 1;
    created += 1;
  }
  return created;
}

export interface GeneratedCardResult {
  created: number;
  diseaseName: string | null;
}

// "Generate from a library page... Drafts only — a human publishes."
// Wires flashcard-generation.ts's extraction+Claude call to the same
// draft-card insert every other creation path uses — generated cards
// are ordinary drafts from here on, no separate "AI-generated" status.
export async function generateCardsFromDisease(deckId: string, diseaseId: string, count: number): Promise<GeneratedCardResult> {
  const { rows: deckRows } = await pool.query(`SELECT 1 FROM flashcard_deck WHERE id = $1 AND owner_type = 'system'`, [deckId]);
  if (deckRows.length === 0) return { created: 0, diseaseName: null };

  const { extractDiseaseTextForCards, generateCardDrafts } = await import("@/lib/flashcard-generation");
  const source = await extractDiseaseTextForCards(diseaseId);
  if (!source) return { created: 0, diseaseName: null };

  const drafts = await generateCardDrafts(source.diseaseName, source.text, count);
  const created = await bulkImportCards(deckId, drafts);
  return { created, diseaseName: source.diseaseName };
}

const NEEDS_REVIEW_MONTHS = 12;
const MIN_ANSWERS_FOR_HEALTH_RANKING = 5;

export interface CardHealthRow {
  cardId: string;
  question: string;
  deckId: string;
  deckName: string;
  totalAnswers: number;
  correctPercent: number;
}

// "A list of cards with the worst retention across all users — the
// cards everybody fails are usually badly written, not hard."
// Requires at least MIN_ANSWERS_FOR_HEALTH_RANKING logged answers so a
// card two people have ever seen doesn't rank as "worst" off a single
// bad day.
export async function getCardHealthReport(limit = 30): Promise<CardHealthRow[]> {
  const { rows } = await pool.query(
    `SELECT f.id AS card_id, f.question, d.id AS deck_id, d.name AS deck_name,
       COUNT(rl.id)::int AS total_answers,
       ROUND(100.0 * COUNT(*) FILTER (WHERE rl.grade != 'again') / COUNT(rl.id))::int AS correct_percent
     FROM flashcard_review_log rl
     JOIN flashcard f ON f.id = rl.flashcard_id
     JOIN flashcard_deck d ON d.id = f.deck_id AND d.owner_type = 'system'
     WHERE f.deleted_at IS NULL
     GROUP BY f.id, f.question, d.id, d.name
     HAVING COUNT(rl.id) >= $1
     ORDER BY correct_percent ASC, total_answers DESC
     LIMIT $2`,
    [MIN_ANSWERS_FOR_HEALTH_RANKING, limit]
  );
  return rows.map((r) => ({
    cardId: r.card_id,
    question: r.question,
    deckId: r.deck_id,
    deckName: r.deck_name,
    totalAnswers: r.total_answers,
    correctPercent: r.correct_percent,
  }));
}

// "reviewed_at and reviewed_by per deck, a 'needs review' filter after
// 12 months." The column already exists (migration 0067, set by
// publishAdminDeck) — this just names the threshold in one place
// rather than each caller re-deriving it.
export function deckNeedsReview(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const monthsAgo = (Date.now() - new Date(reviewedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAgo >= NEEDS_REVIEW_MONTHS;
}
