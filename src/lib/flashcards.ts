import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import { nextBox, computeDueAt, MASTERY_BOX } from "@/lib/flashcard-scoring";
import type { CardIconName } from "@/components/ui/cardIcons";
import { type TopicColor, isTopicColor, pickFreeTopicColor } from "@/lib/flashcard-topic-colors";
import { type FlashcardSubject, isFlashcardSubject, SUBJECT_ORDER } from "@/lib/flashcard-subjects";
import { sanitizeRichText } from "@/lib/rich-text";
import {
  type CardState,
  type Grade,
  type Sm2State,
  type Sm2Outcome,
  NEW_CARD_STATE,
  applyGrade,
  KNOWN_INTERVAL_THRESHOLD_DAYS,
} from "@/lib/flashcard-sm2";

// Preset ("system") decks + member-created ("user") decks, sharing one
// table set — see db/migrations/0041_flashcards.sql for why this is a
// standalone schema rather than a 15th KnowledgeObjectType. Same
// pool.query / no-ORM / ownership-checked-in-SQL style as atlas.ts.

export type DeckOwnerType = "system" | "user";

// Folders that group decks (db/migrations/0044, ownership split added in
// 0045) — a deck's icon/topicLabel below is read off its assigned
// category (name/icon/color), replacing the earlier region-keyword-
// derived version. A "system" folder is editor/admin-curated and
// organizes preset decks, shown to everyone; a "user" folder is a
// member's own, private, and only ever holds that member's own decks
// (see setDeckCategory's ownership-matching WHERE clause below).
export interface FlashcardCategory {
  id: string;
  ownerType: DeckOwnerType;
  name: string;
  color: CardColor;
  // The Candy palette key (flashcard-topic-colors.ts) — separate from
  // `color` above, which stays the app-wide CardColor used for the
  // folder's icon chip until a later pass moves the dashboard itself
  // onto the topic palette. Nullable only for rows inserted before
  // migration 0062; every category created since gets one assigned.
  topicColor: TopicColor | null;
  // The Browse-the-library grouping (flashcard-subjects.ts) — a coarser,
  // fixed 4-way classification distinct from topicColor above. Only
  // meaningful for system topics (only they render in "Browse the
  // library"), but every row carries one since the column defaults
  // every topic to 'other'.
  subject: FlashcardSubject;
  icon: CardIconName | undefined;
  deckCount: number;
  // True for the one open sample folder a signed-out visitor can fully
  // browse (mirrors clinical_calculator.is_public) — every other
  // "system" folder still shows its tile (browsable, not hidden), but
  // its detail page gates the deck list itself behind a session.
  // Always true for a "user" folder (its owner is always signed in).
  isPublic: boolean;
}

export interface DeckSummary {
  id: string;
  ownerType: DeckOwnerType;
  name: string;
  description: string;
  color: CardColor;
  cardCount: number;
  masteredCount: number | null; // null when there's no session to score against
  startedCount: number | null; // any card with progress at all (any box), not just mastered; null when signed out
  categoryId: string | null; // the folder this preset deck belongs to; always null for user decks
  icon: CardIconName | undefined; // the assigned category's icon; undefined for user decks or an uncategorized preset deck
  topicLabel: string | undefined; // the assigned category's name
  iconUrl: string | null; // uploaded image, overrides `icon` when set (editor-uploaded on a preset deck, or a member's own deck)
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
  icon: CardIconName | undefined;
  iconUrl: string | null;
  categoryId: string | null;
  categoryColor: CardColor | null;
  lastCardId: string | null;
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
  started_count: string | null;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  icon_url: string | null;
}): DeckSummary {
  return {
    id: r.id,
    ownerType: r.owner_type,
    name: r.name,
    description: r.description,
    color: r.color,
    cardCount: Number(r.card_count),
    masteredCount: r.mastered_count === null ? null : Number(r.mastered_count),
    startedCount: r.started_count === null ? null : Number(r.started_count),
    categoryId: r.category_id,
    icon: (r.category_icon as CardIconName | null) ?? undefined,
    topicLabel: r.category_name ?? undefined,
    iconUrl: r.icon_url,
  };
}

export async function getDeckSummaries(
  userId: string | null
): Promise<{ presetDecks: DeckSummary[]; userDecks: DeckSummary[] }> {
  const masteredSelect = userId
    ? `, (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
       ) AS started_count`
    : `, NULL::bigint AS mastered_count, NULL::bigint AS started_count`;

  const { rows: presetRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color, d.icon_url,
       d.category_id, c.name AS category_name, c.icon AS category_icon,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL) AS card_count
       ${masteredSelect}
     FROM flashcard_deck d
     LEFT JOIN flashcard_category c ON c.id = d.category_id
     WHERE d.owner_type = 'system' AND d.status = 'published' AND d.archived_at IS NULL
     ORDER BY d.position, d.name`,
    userId ? [userId] : []
  );

  if (!userId) {
    return { presetDecks: presetRows.map(mapDeckSummaryRow), userDecks: [] };
  }

  const { rows: userRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color, d.icon_url,
       d.category_id, c.name AS category_name, c.icon AS category_icon,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL) AS card_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
       ) AS started_count
     FROM flashcard_deck d
     LEFT JOIN flashcard_category c ON c.id = d.category_id
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
    `SELECT d.id, d.owner_type, d.name, d.description, d.color, d.icon_url, d.category_id, d.status, d.archived_at,
       c.icon AS category_icon, c.color AS category_color,
       dis.canonical_name AS source_disease_name, dis.slug AS source_disease_slug
     FROM flashcard_deck d
     LEFT JOIN disease dis ON dis.id = d.source_disease_id
     LEFT JOIN flashcard_category c ON c.id = d.category_id
     WHERE d.id = $1`,
    [deckId]
  );
  const deck = deckRows[0];
  if (!deck) return null;
  // A draft/archived system deck doesn't exist for a reader — same
  // "never serve a draft" rule STUDY_CARD_SELECT enforces. A user's
  // own deck is never draft/archived by construction (only the admin
  // CMS, system-only, can set those), so this never affects them.
  if (deck.owner_type === "system" && (deck.status !== "published" || deck.archived_at !== null)) return null;

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
         WHERE f.deck_id = $1 AND f.status = 'published' AND f.deleted_at IS NULL
         ORDER BY f.position, f.created_at`
      : `SELECT f.id, f.question, f.answer, f.position, NULL::int AS box, NULL::date AS due_at
         FROM flashcard f
         WHERE f.deck_id = $1 AND f.status = 'published' AND f.deleted_at IS NULL
         ORDER BY f.position, f.created_at`,
    userId ? [deckId, userId] : [deckId]
  );

  // Where "Continue" (StartDeckButton) should resume — the card this
  // user was last looking at, not derivable from box/due_at alone
  // (those track per-card mastery, not "where did I stop scrolling").
  // null for signed-out visitors and for a deck no one has positioned
  // in yet, both of which fall back to card 1 in the reviewer.
  let lastCardId: string | null = null;
  if (userId) {
    const { rows: positionRows } = await pool.query(
      `SELECT card_id FROM flashcard_deck_position WHERE user_id = $1 AND deck_id = $2`,
      [userId, deckId]
    );
    lastCardId = positionRows[0]?.card_id ?? null;
  }

  return {
    id: deck.id,
    ownerType: deck.owner_type,
    name: deck.name,
    description: deck.description,
    color: deck.color,
    icon: (deck.category_icon as CardIconName | null) ?? undefined,
    iconUrl: deck.icon_url,
    categoryId: deck.category_id,
    categoryColor: (deck.category_color as CardColor | null) ?? null,
    lastCardId,
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

// ============================================================
// Pass 2 — the study screen. A parallel data path from everything
// above: reads flashcard_sm2_progress/flashcard_review_log (0063),
// not flashcard_progress (0041, still backing the old inline
// /flashcards/[deckId] reviewer until a later pass cuts that over).
// ============================================================

export interface StudyCard {
  id: string;
  question: string;
  answer: string;
  deckId: string;
  deckName: string;
  deckColor: CardColor;
  categoryId: string | null;
  topicColor: TopicColor | null;
  topicName: string | null;
  sourceDiseaseName: string | null;
  sourceDiseaseSlug: string | null;
  sourceReviewedAt: string | null;
  sm2: Sm2State;
}

function mapStudyCardRow(r: {
  id: string;
  question: string;
  answer: string;
  deck_id: string;
  deck_name: string;
  deck_color: CardColor;
  category_id: string | null;
  topic_color: string | null;
  category_name: string | null;
  source_disease_name: string | null;
  source_disease_slug: string | null;
  source_reviewed_at: string | null;
  state: CardState | null;
  ease_factor: number | null;
  interval_days: number | null;
  repetitions: number | null;
}): StudyCard {
  return {
    id: r.id,
    question: r.question,
    answer: r.answer,
    deckId: r.deck_id,
    deckName: r.deck_name,
    deckColor: r.deck_color,
    categoryId: r.category_id,
    topicColor: isTopicColor(r.topic_color) ? r.topic_color : null,
    topicName: r.category_name,
    sourceDiseaseName: r.source_disease_name,
    sourceDiseaseSlug: r.source_disease_slug,
    sourceReviewedAt: r.source_reviewed_at,
    sm2:
      r.state && r.ease_factor !== null && r.interval_days !== null && r.repetitions !== null
        ? { state: r.state, easeFactor: r.ease_factor, intervalDays: r.interval_days, repetitions: r.repetitions }
        : NEW_CARD_STATE,
  };
}

// Both joins are gated to published/non-archived/non-deleted content
// right in the ON clause — every reader-facing caller below builds its
// own WHERE on top of this, so baking the visibility rule in here
// once means no caller can forget it (FLASHCARDS-IMPLEMENTATION.md
// Pass 5: "publishing a card makes it available to every reader
// immediately" — the inverse must hold too, a draft is never served).
const STUDY_CARD_SELECT = `
  SELECT f.id, f.question, f.answer, f.deck_id,
    d.name AS deck_name, d.color AS deck_color, d.category_id,
    c.name AS category_name, c.topic_color,
    dis.canonical_name AS source_disease_name, dis.slug AS source_disease_slug, dis.reviewed_at AS source_reviewed_at,
    p.state, p.ease_factor, p.interval_days, p.repetitions
  FROM flashcard f
  JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
  LEFT JOIN flashcard_category c ON c.id = d.category_id
  LEFT JOIN disease dis ON dis.id = d.source_disease_id
  LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
  WHERE f.status = 'published' AND f.deleted_at IS NULL
`;

// Due now: never studied (no progress row) or due_at has passed. Cards
// still short-interval "learning"/"relearning" get requeued by the
// client within the same session (StudySession.tsx) rather than
// re-querying the DB — see flashcard-sm2.ts's own module comment.
const STUDY_CARD_DUE_FILTER = `AND (p.due_at IS NULL OR p.due_at <= now())`;

// The topic a deck belongs to — used to send a finished deck-scoped
// study session back to its topic page rather than the legacy
// /flashcards/[deckId] reviewer. Queried directly rather than read off
// the study session's own cards, since those are empty whenever the
// deck has nothing due (e.g. just finished studying it).
export async function getDeckCategoryId(deckId: string): Promise<string | null> {
  const { rows } = await pool.query(`SELECT category_id FROM flashcard_deck WHERE id = $1`, [deckId]);
  return rows[0]?.category_id ?? null;
}

// One deck's due cards — `deckId` ownership-checked the same way
// getDeckWithCards does (a private user deck 404s for anyone but its
// owner; a system deck is open to any signed-in user). `includeNotDue`
// backs the deck row's "Review early" action (FLASHCARDS-SPEC.md) —
// studying every card regardless of due_at, for a deck already
// finished today.
export async function getStudyCardsForDeck(userId: string, deckId: string, includeNotDue = false): Promise<StudyCard[] | null> {
  const { rows: ownerCheck } = await pool.query(
    `SELECT 1 FROM flashcard_deck WHERE id = $1 AND (owner_type = 'system' OR user_id = $2)`,
    [deckId, userId]
  );
  if (ownerCheck.length === 0) return null;

  const { rows } = await pool.query(
    `${STUDY_CARD_SELECT} AND f.deck_id = $2 ${includeNotDue ? "" : STUDY_CARD_DUE_FILTER} ORDER BY f.position, f.created_at`,
    [userId, deckId]
  );
  return rows.map(mapStudyCardRow);
}

// A whole topic's due cards across every deck in it — same ownership
// rule as getCategoryWithDecks (a private user folder 404s for
// anyone but its owner).
export async function getStudyCardsForCategory(userId: string, categoryId: string, includeNotDue = false): Promise<StudyCard[] | null> {
  const { rows: ownerCheck } = await pool.query(
    `SELECT 1 FROM flashcard_category WHERE id = $1 AND (owner_type = 'system' OR user_id = $2)`,
    [categoryId, userId]
  );
  if (ownerCheck.length === 0) return null;

  const { rows } = await pool.query(
    `${STUDY_CARD_SELECT} AND d.category_id = $2 ${includeNotDue ? "" : STUDY_CARD_DUE_FILTER} ORDER BY d.position, f.position, f.created_at`,
    [userId, categoryId]
  );
  return rows.map(mapStudyCardRow);
}

// "So the person can review only the weak ones" — the exact same set
// TopicWeakCards.tsx lists (getTopicWeakCards' own "grade='again' in
// the last 7 days" ranking, same default limit), fed through
// STUDY_CARD_SELECT instead of the lighter WeakCard shape so it can
// feed a real study session (SM-2 state, grading, the works) rather
// than just linking out to each card's whole deck. Ignores due_at —
// a weak card is worth reviewing regardless of whether SM-2 already
// pushed its next due date out.
export async function getWeakStudyCardsForCategory(userId: string, categoryId: string, limit = 5): Promise<StudyCard[] | null> {
  const { rows: ownerCheck } = await pool.query(
    `SELECT 1 FROM flashcard_category WHERE id = $1 AND (owner_type = 'system' OR user_id = $2)`,
    [categoryId, userId]
  );
  if (ownerCheck.length === 0) return null;

  const { rows } = await pool.query(
    `${STUDY_CARD_SELECT}
       AND d.category_id = $2
       AND f.id IN (
         SELECT rl.flashcard_id FROM flashcard_review_log rl
         WHERE rl.user_id = $1 AND rl.grade = 'again' AND rl.reviewed_at > now() - interval '7 days'
         GROUP BY rl.flashcard_id
         ORDER BY COUNT(*) DESC
         LIMIT $3
       )
     ORDER BY d.position, f.position, f.created_at`,
    [userId, categoryId, limit]
  );
  return rows.map(mapStudyCardRow);
}

// Every due card across every deck this user can reach — system
// topics are directly studyable (no add/copy step), so "reach" means
// the same accessible-deck condition getStudyCardsForDeck's own
// ownership check uses, applied account-wide (the dashboard's "Start
// review" button, FLASHCARDS-SPEC.md rule 2: "never offer a session
// that doesn't exist" — this is the one entry point with no single
// deck/topic to scope to).
export async function getStudyCardsForAccount(userId: string, includeNotDue = false): Promise<StudyCard[]> {
  const { rows } = await pool.query(
    `${STUDY_CARD_SELECT} AND (d.owner_type = 'system' OR d.user_id = $1) ${includeNotDue ? "" : STUDY_CARD_DUE_FILTER} ORDER BY d.position, f.position, f.created_at`,
    [userId]
  );
  return rows.map(mapStudyCardRow);
}

// Write-before-advance (FLASHCARDS-IMPLEMENTATION.md: "Write the
// review log on every grade, before the UI advances") — one
// transaction covering both the log insert and the progress upsert,
// so a mid-write failure can never leave one without the other.
export async function recordSm2Review(
  userId: string,
  flashcardId: string,
  deckId: string,
  current: Sm2State,
  grade: Grade
): Promise<Sm2Outcome> {
  const outcome = applyGrade(current, grade);
  const dueAt = new Date(Date.now() + outcome.dueInMinutes * 60_000);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO flashcard_sm2_progress (user_id, flashcard_id, state, ease_factor, interval_days, repetitions, due_at, last_reviewed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       ON CONFLICT (user_id, flashcard_id) DO UPDATE
       SET state = $3, ease_factor = $4, interval_days = $5, repetitions = $6, due_at = $7, last_reviewed_at = now()`,
      [userId, flashcardId, outcome.next.state, outcome.next.easeFactor, outcome.next.intervalDays, outcome.next.repetitions, dueAt]
    );
    await client.query(
      `INSERT INTO flashcard_review_log (user_id, flashcard_id, deck_id, grade, state_before, state_after, interval_before_days, interval_after_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, flashcardId, deckId, grade, current.state, outcome.next.state, current.intervalDays, outcome.next.intervalDays]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return outcome;
}

// Consecutive days (in the user's own local calendar day — the
// caller passes today's Y-M-D string, e.g. from the browser's
// Intl.DateTimeFormat, not the server's UTC day) with at least one
// review logged. Walks backward from today; stops at the first gap.
export async function getUserStreak(userId: string, todayYmd: string): Promise<number> {
  const { rows } = await pool.query<{ day: string }>(
    `SELECT DISTINCT (reviewed_at AT TIME ZONE 'UTC')::date::text AS day
     FROM flashcard_review_log WHERE user_id = $1
     ORDER BY day DESC LIMIT 400`,
    [userId]
  );
  const reviewedDays = new Set(rows.map((r) => r.day));
  let streak = 0;
  const cursor = new Date(`${todayYmd}T00:00:00Z`);
  while (reviewedDays.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

// "Known %" (FLASHCARDS-SPEC.md — reused verbatim by the dashboard in
// a later pass): cards in review with interval >= 21 days, over every
// card in the topic (including ones never studied).
export async function getTopicKnownPercent(userId: string, categoryId: string): Promise<number> {
  const { rows } = await pool.query<{ total: string; known: string }>(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known
     FROM flashcard f
     JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE d.category_id = $2 AND f.status = 'published' AND f.deleted_at IS NULL`,
    [userId, categoryId]
  );
  const { total, known } = rows[0] ?? { total: "0", known: "0" };
  return Number(total) === 0 ? 0 : Math.round((Number(known) / Number(total)) * 100);
}

// ============================================================
// Pass 3 — the topic page
// ============================================================

export interface TopicDeckRow {
  id: string;
  name: string;
  color: CardColor;
  iconUrl: string | null;
  isFavorited: boolean;
  cardCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  knownCount: number;
  dueCount: number;
  lastStudiedAt: string | null;
  sourceDiseaseName: string | null;
  sourceDiseaseSlug: string | null;
  // "The reviewed date shown to readers on the card's source line"
  // (FLASHCARDS-IMPLEMENTATION.md Pass 7) — set by publishAdminDeck,
  // null for a deck that's never been through the admin review flow
  // (every pre-existing deck, and any member's own deck).
  reviewedAt: string | null;
}

// Per-deck rollup for the topic page's deck rows. last_studied_at is a
// scalar subquery rather than a third join — joining flashcard_review_log
// (many rows per card) alongside flashcard/flashcard_sm2_progress (one
// row per card) in the same GROUP BY would fan out and inflate every
// COUNT() in this query. Every FILTER also checks `f.id IS NOT NULL`:
// without it, a deck with zero cards still gets one row out of the
// LEFT JOIN chain (f and p both null), and `p.state IS NULL` /
// `p.due_at IS NULL` read as true for that phantom row — miscounting
// an empty deck as 1 new/due card.
// userId is nullable — a signed-out visitor to a public topic still
// sees the deck list (canBrowseFolder), just with every personal
// column (due/known/favourite/last-studied) naturally coming back
// empty, since `p.user_id = NULL` / `... = NULL` never matches in SQL
// rather than needing a second no-session query shape.
export async function getTopicDeckRows(userId: string | null, categoryId: string): Promise<TopicDeckRow[]> {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.color, d.icon_url, d.reviewed_at,
       dis.canonical_name AS source_disease_name, dis.slug AS source_disease_slug,
       COUNT(f.id)::int AS card_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.state IS NULL OR p.state = 'new'))::int AS new_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'learning')::int AS learning_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review')::int AS review_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.due_at IS NULL OR p.due_at <= now()))::int AS due_count,
       (SELECT MAX(reviewed_at) FROM flashcard_review_log WHERE deck_id = d.id AND user_id = $1) AS last_studied_at,
       EXISTS (SELECT 1 FROM flashcard_deck_favorite WHERE deck_id = d.id AND user_id = $1) AS is_favorited
     FROM flashcard_deck d
     LEFT JOIN disease dis ON dis.id = d.source_disease_id
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE d.category_id = $2 AND d.status = 'published' AND d.archived_at IS NULL
     GROUP BY d.id, dis.canonical_name, dis.slug
     ORDER BY d.position, d.name`,
    [userId, categoryId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    iconUrl: r.icon_url,
    isFavorited: r.is_favorited,
    cardCount: r.card_count,
    newCount: r.new_count,
    learningCount: r.learning_count,
    reviewCount: r.review_count,
    knownCount: r.known_count,
    dueCount: r.due_count,
    lastStudiedAt: r.last_studied_at,
    sourceDiseaseName: r.source_disease_name,
    sourceDiseaseSlug: r.source_disease_slug,
    reviewedAt: r.reviewed_at,
  }));
}

export interface TopicMetrics {
  dueToday: number;
  // null when there's no review history yet to compute a rate from —
  // never a fabricated 0%, same "null means no data" rule the rest of
  // this app's aggregates already follow.
  retentionPercent: number | null;
  nextReviewAt: string | null;
  lapsesThisWeek: number;
  knownPercent: number;
}

export async function getTopicMetrics(userId: string, categoryId: string): Promise<TopicMetrics> {
  const [dueRows, retentionRows, nextReviewRows, lapseRows, knownPercent] = await Promise.all([
    pool.query<{ due_count: string }>(
      `SELECT COUNT(*)::int AS due_count
       FROM flashcard f
       JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
       LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
       WHERE d.category_id = $2 AND f.status = 'published' AND f.deleted_at IS NULL AND (p.due_at IS NULL OR p.due_at <= now())`,
      [userId, categoryId]
    ),
    // Retention: correct (not "again") ÷ total, over review-state
    // answers only in the last 30 days — same "correct = not a lapse"
    // split Session Complete's own accuracy uses (SessionCompleteView.tsx).
    pool.query<{ total: string; correct: string }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE rl.grade != 'again')::int AS correct
       FROM flashcard_review_log rl
       JOIN flashcard_deck d ON d.id = rl.deck_id
       WHERE d.category_id = $2 AND rl.user_id = $1 AND rl.state_before = 'review'
         AND rl.reviewed_at > now() - interval '30 days'`,
      [userId, categoryId]
    ),
    pool.query<{ next_review_at: string | null }>(
      `SELECT MIN(p.due_at) AS next_review_at
       FROM flashcard f
       JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
       JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
       WHERE d.category_id = $2 AND f.status = 'published' AND f.deleted_at IS NULL AND p.due_at > now()`,
      [userId, categoryId]
    ),
    pool.query<{ lapses: string }>(
      `SELECT COUNT(*)::int AS lapses
       FROM flashcard_review_log rl
       JOIN flashcard_deck d ON d.id = rl.deck_id
       WHERE d.category_id = $2 AND rl.user_id = $1 AND rl.grade = 'again'
         AND rl.reviewed_at > now() - interval '7 days'`,
      [userId, categoryId]
    ),
    getTopicKnownPercent(userId, categoryId),
  ]);

  const retentionTotal = Number(retentionRows.rows[0]?.total ?? 0);
  return {
    dueToday: Number(dueRows.rows[0]?.due_count ?? 0),
    retentionPercent:
      retentionTotal === 0 ? null : Math.round((Number(retentionRows.rows[0].correct) / retentionTotal) * 100),
    nextReviewAt: nextReviewRows.rows[0]?.next_review_at ?? null,
    lapsesThisWeek: Number(lapseRows.rows[0]?.lapses ?? 0),
    knownPercent,
  };
}

export interface WeakCard {
  id: string;
  deckId: string;
  deckName: string;
  question: string;
  lapses: number;
}

// "The actual questions that keep failing" (FLASHCARDS-SPEC.md) —
// same "lapses in the last 7 days" ranking Pass 4's dashboard-level
// "Fix these first" reuses, just scoped to one topic instead of the
// whole account.
export async function getTopicWeakCards(userId: string, categoryId: string, limit = 5): Promise<WeakCard[]> {
  const { rows } = await pool.query(
    `SELECT f.id, f.deck_id, d.name AS deck_name, f.question, COUNT(rl.id)::int AS lapses
     FROM flashcard_review_log rl
     JOIN flashcard f ON f.id = rl.flashcard_id
     JOIN flashcard_deck d ON d.id = f.deck_id
     WHERE d.category_id = $2 AND rl.user_id = $1 AND rl.grade = 'again'
       AND rl.reviewed_at > now() - interval '7 days'
     GROUP BY f.id, d.name, f.question
     ORDER BY lapses DESC, f.question
     LIMIT $3`,
    [userId, categoryId, limit]
  );
  return rows.map((r) => ({ id: r.id, deckId: r.deck_id, deckName: r.deck_name, question: r.question, lapses: r.lapses }));
}

export interface TopicCardRow {
  id: string;
  deckId: string;
  deckName: string;
  question: string;
  state: CardState;
}

// The "All cards" tab — every card in the topic, flattened across its
// decks, for a scan-the-whole-topic view rather than one deck at a
// time.
export async function getTopicAllCards(userId: string, categoryId: string): Promise<TopicCardRow[]> {
  const { rows } = await pool.query(
    `SELECT f.id, f.deck_id, d.name AS deck_name, f.question, p.state
     FROM flashcard f
     JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE d.category_id = $2 AND f.status = 'published' AND f.deleted_at IS NULL
     ORDER BY d.position, d.name, f.position`,
    [userId, categoryId]
  );
  return rows.map((r) => ({ id: r.id, deckId: r.deck_id, deckName: r.deck_name, question: r.question, state: r.state ?? "new" }));
}

// ============================================================
// Pass 4 — the dashboard
// ============================================================

export interface DashboardMetrics {
  streak: number;
  retentionPercent: number | null;
  totalCards: number;
  dueToday: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  // "estimated time = cards x 6s, rounded to the minute"
  // (FLASHCARDS-IMPLEMENTATION.md) — 0 only when dueToday is itself 0.
  estimatedMinutes: number;
}

// Every deck this user can reach: system topics (directly studyable,
// no add/copy step) plus their own.
export async function getDashboardMetrics(userId: string, todayYmd: string): Promise<DashboardMetrics> {
  const [countRows, retentionRows, streak] = await Promise.all([
    pool.query<{ total_cards: number; due_today: number; new_count: number; learning_count: number; review_count: number }>(
      `SELECT
         COUNT(f.id)::int AS total_cards,
         COUNT(*) FILTER (WHERE p.due_at IS NULL OR p.due_at <= now())::int AS due_today,
         COUNT(*) FILTER (WHERE p.state IS NULL OR p.state = 'new')::int AS new_count,
         COUNT(*) FILTER (WHERE p.state = 'learning')::int AS learning_count,
         COUNT(*) FILTER (WHERE p.state = 'review')::int AS review_count
       FROM flashcard f
       JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
       LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
       WHERE (d.owner_type = 'system' OR d.user_id = $1) AND f.status = 'published' AND f.deleted_at IS NULL`,
      [userId]
    ),
    pool.query<{ total: number; correct: number }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE rl.grade != 'again')::int AS correct
       FROM flashcard_review_log rl
       JOIN flashcard_deck d ON d.id = rl.deck_id
       WHERE rl.user_id = $1 AND rl.state_before = 'review' AND rl.reviewed_at > now() - interval '30 days'
         AND (d.owner_type = 'system' OR d.user_id = $1)`,
      [userId]
    ),
    getUserStreak(userId, todayYmd),
  ]);

  const c = countRows.rows[0];
  const r = retentionRows.rows[0];
  const dueToday = Number(c?.due_today ?? 0);
  return {
    streak,
    retentionPercent: !r || Number(r.total) === 0 ? null : Math.round((Number(r.correct) / Number(r.total)) * 100),
    totalCards: Number(c?.total_cards ?? 0),
    dueToday,
    newCount: Number(c?.new_count ?? 0),
    learningCount: Number(c?.learning_count ?? 0),
    reviewCount: Number(c?.review_count ?? 0),
    estimatedMinutes: dueToday === 0 ? 0 : Math.max(1, Math.round((dueToday * 6) / 60)),
  };
}

export interface ForecastDay {
  date: string;
  count: number;
}

// Seven bars, today first — cards whose current due_at falls on each
// of the next 7 days. Days with nothing due still get a zero-count
// entry (a bar with no height), never an absent day.
export async function getSevenDayForecast(userId: string, todayYmd: string): Promise<ForecastDay[]> {
  const { rows } = await pool.query<{ day: string; count: string }>(
    `SELECT (p.due_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*)::int AS count
     FROM flashcard f
     JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
     JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE (d.owner_type = 'system' OR d.user_id = $1) AND f.status = 'published' AND f.deleted_at IS NULL
       AND p.due_at >= $2::date AND p.due_at < $2::date + interval '7 days'
     GROUP BY day`,
    [userId, todayYmd]
  );
  const counts = new Map(rows.map((r) => [r.day, Number(r.count)]));
  const start = new Date(`${todayYmd}T00:00:00Z`);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const dayStr = d.toISOString().slice(0, 10);
    return { date: dayStr, count: counts.get(dayStr) ?? 0 };
  });
}

// Same shape as TopicDeckRow (id/name/color/iconUrl/isFavorited/
// cardCount/new-learning-review/knownCount/dueCount/lastStudiedAt/
// source*) — the dashboard grid only ever shows unfiled decks
// (category_id IS NULL, the same "a filed deck only shows in its
// folder, not duplicated here" rule FlashcardsBrowser.tsx already
// followed), so there is no topic/category to carry per row. `userId`
// is nullable — a signed-out visitor still browses preset decks (same
// convention as getTopicDeckRows), just with every personal column
// naturally empty since `... = NULL` never matches in SQL. Same
// `f.id IS NOT NULL` guard on every FILTER as getTopicDeckRows, for
// the same empty-deck phantom-row reason.
// Signed-in sees only owned decks, not system ones — copy-on-add
// (FLASHCARDS-ADD-TOPIC-IMPLEMENTATION.md) means system content only
// enters the account via Add Topic, which always assigns a category,
// so it can never actually land here unfiled; signed-out still
// browses unfiled system decks directly (there is no account to add
// them to).
export async function getDashboardDeckRows(userId: string | null): Promise<TopicDeckRow[]> {
  const { rows } = await pool.query(
    `SELECT d.id, d.name, d.color, d.icon_url, d.reviewed_at,
       dis.canonical_name AS source_disease_name, dis.slug AS source_disease_slug,
       COUNT(f.id)::int AS card_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.state IS NULL OR p.state = 'new'))::int AS new_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'learning')::int AS learning_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review')::int AS review_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.due_at IS NULL OR p.due_at <= now()))::int AS due_count,
       (SELECT MAX(reviewed_at) FROM flashcard_review_log WHERE deck_id = d.id AND user_id = $1) AS last_studied_at,
       EXISTS (SELECT 1 FROM flashcard_deck_favorite WHERE deck_id = d.id AND user_id = $1) AS is_favorited
     FROM flashcard_deck d
     LEFT JOIN disease dis ON dis.id = d.source_disease_id
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE d.category_id IS NULL AND d.status = 'published' AND d.archived_at IS NULL
       AND ((d.owner_type = 'system' AND $1::uuid IS NULL) OR (d.owner_type = 'user' AND d.user_id = $1))
     GROUP BY d.id, dis.canonical_name, dis.slug
     ORDER BY d.position, d.name`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    iconUrl: r.icon_url,
    isFavorited: r.is_favorited,
    cardCount: r.card_count,
    newCount: r.new_count,
    learningCount: r.learning_count,
    reviewCount: r.review_count,
    knownCount: r.known_count,
    dueCount: r.due_count,
    lastStudiedAt: r.last_studied_at,
    sourceDiseaseName: r.source_disease_name,
    sourceDiseaseSlug: r.source_disease_slug,
    reviewedAt: r.reviewed_at,
  }));
}

// One batched query for every folder's due badge (FLASHCARDS-SPEC.md
// rule 5: "due counts appear everywhere they are actionable — rail,
// folder, deck") rather than one query per folder. A signed-out
// visitor gets an empty map (every badge naturally 0) the same way
// getDashboardDeckRows handles a null userId.
export async function getFolderDueBadges(userId: string | null): Promise<Map<string, number>> {
  if (!userId) return new Map();
  const { rows } = await pool.query<{ category_id: string; due_count: number }>(
    `SELECT d.category_id, COUNT(*)::int AS due_count
     FROM flashcard f
     JOIN flashcard_deck d ON d.id = f.deck_id
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE d.category_id IS NOT NULL
       AND d.user_id = $1
       AND (p.due_at IS NULL OR p.due_at <= now())
     GROUP BY d.category_id`,
    [userId]
  );
  return new Map(rows.map((r) => [r.category_id, Number(r.due_count)]));
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
  return {
    ...mapDeckSummaryRow({
      ...rows[0],
      card_count: "0",
      mastered_count: "0",
      started_count: "0",
      category_id: null,
      category_name: null,
      category_icon: null,
      icon_url: null,
    }),
  };
}

// isEditor widens the ownership check to also match any system
// (preset) deck, regardless of the caller's own user_id — an editor
// managing preset content isn't the deck's "owner" in the user_id
// sense, so this can't be expressed as a plain owner match. A member
// who isn't an editor only ever matches the user_type branch, exactly
// as before.
export async function renameDeck(
  userId: string,
  deckId: string,
  name: string,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET name = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [name, deckId, userId, isEditor]
  );
}

export async function updateDeckColor(
  userId: string,
  deckId: string,
  color: CardColor,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET color = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [color, deckId, userId, isEditor]
  );
}

// iconUrl: null clears back to the region-derived default icon.
export async function updateDeckIcon(
  userId: string,
  deckId: string,
  iconUrl: string | null,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck SET icon_url = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [iconUrl, deckId, userId, isEditor]
  );
}

export async function deleteDeck(userId: string, deckId: string, isEditor: boolean): Promise<void> {
  await pool.query(
    `DELETE FROM flashcard_deck
     WHERE id = $1 AND ((owner_type = 'user' AND user_id = $2) OR (owner_type = 'system' AND $3))`,
    [deckId, userId, isEditor]
  );
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
  answer: string,
  isEditor: boolean
): Promise<FlashcardCard | null> {
  const { rows } = await pool.query(
    `INSERT INTO flashcard (deck_id, question, answer, position)
     SELECT $2, $3, $4, COALESCE((SELECT COUNT(*) FROM flashcard WHERE deck_id = $2), 0)
     WHERE EXISTS (
       SELECT 1 FROM flashcard_deck
       WHERE id = $2 AND ((owner_type = 'user' AND user_id = $1) OR (owner_type = 'system' AND $5))
     )
     RETURNING id, question, answer, position`,
    [userId, deckId, sanitizeRichText(question), sanitizeRichText(answer), isEditor]
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, question: row.question, answer: row.answer, position: row.position, box: null, dueAt: null };
}

// Every save bumps content_version, whether or not the meaning
// changed — "a typo fix must not reset anyone's progress"
// (FLASHCARDS-IMPLEMENTATION.md Pass 6), and this quick inline path
// (the one live topic pages have always used) never resets scheduling
// at all. The admin CMS's own card editor (flashcards-admin.ts) is the
// only place that can flag "this changes the answer" and reset
// reviewers' progress — a deliberate, separate, slower path for that
// riskier action.
export async function updateCard(
  userId: string,
  cardId: string,
  question: string,
  answer: string,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard f SET question = $1, answer = $2, updated_at = now(), content_version = content_version + 1
     FROM flashcard_deck d
     WHERE f.id = $3 AND f.deck_id = d.id
       AND ((d.owner_type = 'user' AND d.user_id = $4) OR (d.owner_type = 'system' AND $5))`,
    [sanitizeRichText(question), sanitizeRichText(answer), cardId, userId, isEditor]
  );
}

export async function deleteCard(userId: string, cardId: string, isEditor: boolean): Promise<void> {
  await pool.query(
    `DELETE FROM flashcard f
     USING flashcard_deck d
     WHERE f.id = $1 AND f.deck_id = d.id
       AND ((d.owner_type = 'user' AND d.user_id = $2) OR (d.owner_type = 'system' AND $3))`,
    [cardId, userId, isEditor]
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

// Clicking "Study deck" always starts a fresh session — deletes this
// user's box/due-date progress for every card in the deck so mastery
// doesn't carry over between study sessions, and clears the resume
// position alongside it so the reviewer actually reopens on card 1.
// A plain DELETE with no matching rows is a harmless no-op, so this
// is safe to call unconditionally rather than checking for prior
// progress first.
export async function resetDeckProgress(userId: string, deckId: string): Promise<void> {
  await pool.query(
    `DELETE FROM flashcard_progress
     WHERE user_id = $1 AND flashcard_id IN (SELECT id FROM flashcard WHERE deck_id = $2)`,
    [userId, deckId]
  );
  await pool.query(
    `DELETE FROM flashcard_deck_position WHERE user_id = $1 AND deck_id = $2`,
    [userId, deckId]
  );
}

// Called as the reviewer's current card changes (and cleared once a
// pass reaches the completion screen) — see getDeckWithCards's
// lastCardId for how this is read back on the next visit. cardId null
// clears the position (nothing to resume; "Continue" falls back to
// card 1) rather than leaving a stale row pointing at a finished pass.
export async function saveReviewPosition(
  userId: string,
  deckId: string,
  cardId: string | null
): Promise<void> {
  if (cardId === null) {
    await pool.query(`DELETE FROM flashcard_deck_position WHERE user_id = $1 AND deck_id = $2`, [
      userId,
      deckId,
    ]);
    return;
  }
  await pool.query(
    `INSERT INTO flashcard_deck_position (user_id, deck_id, card_id, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, deck_id) DO UPDATE SET card_id = $3, updated_at = now()`,
    [userId, deckId, cardId]
  );
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

// Not a real category — a computed view over flashcard_deck_favorite,
// surfaced as a "Favourites" folder tile in FlashcardsBrowser (its own
// /flashcards/favourites route, not /flashcards/category/[id]) since
// it has no id, no owner row, and nothing to rename/recolor/delete.
export async function getFavoritedDecks(userId: string): Promise<DeckSummary[]> {
  const { rows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color, d.icon_url,
       d.category_id, c.name AS category_name, c.icon AS category_icon,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL) AS card_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $1
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
       ) AS started_count
     FROM flashcard_deck_favorite fav
     JOIN flashcard_deck d ON d.id = fav.deck_id AND d.status = 'published' AND d.archived_at IS NULL
     LEFT JOIN flashcard_category c ON c.id = d.category_id
     WHERE fav.user_id = $1
     ORDER BY fav.created_at DESC`,
    [userId]
  );
  return rows.map(mapDeckSummaryRow);
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

// Mirrors toggleDeckFavorite exactly — a topic (flashcard_category)
// gets the same personal per-user star a deck already has, backing
// "Your topics"'s favourites-first ordering.
export async function toggleCategoryFavorite(userId: string, categoryId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `DELETE FROM flashcard_category_favorite WHERE user_id = $1 AND category_id = $2 RETURNING 1`,
    [userId, categoryId]
  );
  if (rows.length > 0) return false;

  await pool.query(`INSERT INTO flashcard_category_favorite (user_id, category_id) VALUES ($1, $2)`, [
    userId,
    categoryId,
  ]);
  return true;
}

function mapCategoryRow(r: {
  id: string;
  owner_type: DeckOwnerType;
  name: string;
  color: CardColor;
  topic_color?: string | null;
  subject?: string | null;
  icon: string | null;
  deck_count: string;
  is_public?: boolean;
}): FlashcardCategory {
  return {
    id: r.id,
    ownerType: r.owner_type,
    name: r.name,
    color: r.color,
    topicColor: isTopicColor(r.topic_color) ? r.topic_color : null,
    subject: isFlashcardSubject(r.subject) ? r.subject : "other",
    icon: (r.icon as CardIconName | null) ?? undefined,
    deckCount: Number(r.deck_count),
    isPublic: r.owner_type === "user" ? true : Boolean(r.is_public),
  };
}

export async function getCategories(
  userId: string | null
): Promise<{ systemCategories: FlashcardCategory[]; userCategories: FlashcardCategory[] }> {
  const { rows: systemRows } = await pool.query(
    `SELECT c.id, c.owner_type, c.name, c.color, c.topic_color, c.subject, c.icon, c.is_public,
       (SELECT COUNT(*) FROM flashcard_deck d WHERE d.category_id = c.id AND d.status = 'published' AND d.archived_at IS NULL) AS deck_count
     FROM flashcard_category c
     WHERE c.owner_type = 'system'
     ORDER BY c.position, c.name`
  );

  if (!userId) {
    return { systemCategories: systemRows.map(mapCategoryRow), userCategories: [] };
  }

  const { rows: userRows } = await pool.query(
    `SELECT c.id, c.owner_type, c.name, c.color, c.topic_color, c.subject, c.icon,
       (SELECT COUNT(*) FROM flashcard_deck d WHERE d.category_id = c.id) AS deck_count
     FROM flashcard_category c
     WHERE c.owner_type = 'user' AND c.user_id = $1
     ORDER BY c.position, c.name`,
    [userId]
  );

  return {
    systemCategories: systemRows.map(mapCategoryRow),
    userCategories: userRows.map(mapCategoryRow),
  };
}

export interface TopicTile {
  id: string;
  name: string;
  topicColor: TopicColor | null;
  // Populated only by getLibraryTopicTiles — "Your topics" tiles don't
  // group by subject, so they leave this undefined.
  subject?: FlashcardSubject;
  isPublic: boolean;
  isFavorited: boolean;
  deckCount: number;
  cardCount: number;
  newCount: number;
  learningCount: number;
  reviewCount: number;
  knownCount: number;
  dueCount: number;
  // First three deck names, in position order — only populated by
  // getLibraryTopicTiles, for LibraryTopicCard's own stack-of-cards
  // design ("so the topic is concrete" rather than a bare count).
  // "Your topics" tiles leave this undefined; they don't use it.
  sampleDeckTitles?: string[];
}

// "Your topics" — the dashboard's own progress-tile grid
// (flashcards-progress-tiles.html, the spec's "source of truth" for
// this layout): every topic the visitor can see, ring + state bar +
// due badge, whether or not they've studied a single card in it yet —
// a brand-new account with untouched topics still gets 0%/"up to
// date" tiles rather than an empty dashboard. userId nullable, same
// "system-only, `... = NULL` never matches" convention as
// getCategories. Same `f.id IS NOT NULL` phantom-row guard as
// getTopicDeckRows — here it also covers a topic with zero decks at
// all, since an empty LEFT JOIN chain leaves f null either way.
// Ordered favourites first, then most due, then alphabetical
// (FLASHCARDS-TOPICS-SECTION.md) — no manual drag-reorder UI exists
// for topics, so there's no "unless the user set a manual order" tier
// to honour yet.
// Signed-in sees only topics they've added (copy-on-add —
// FLASHCARDS-ADD-TOPIC-IMPLEMENTATION.md); a signed-out visitor still
// browses system topics directly, same as before — there's no account
// for them to add anything into.
export async function getDashboardTopicTiles(userId: string | null): Promise<TopicTile[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.topic_color, c.owner_type, c.is_public,
       EXISTS (SELECT 1 FROM flashcard_category_favorite fav WHERE fav.category_id = c.id AND fav.user_id = $1) AS is_favorited,
       COUNT(DISTINCT d.id)::int AS deck_count,
       COUNT(f.id)::int AS card_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.state IS NULL OR p.state = 'new'))::int AS new_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'learning')::int AS learning_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review')::int AS review_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.due_at IS NULL OR p.due_at <= now()))::int AS due_count
     FROM flashcard_category c
     LEFT JOIN flashcard_deck d ON d.category_id = c.id AND d.status = 'published' AND d.archived_at IS NULL
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE (c.owner_type = 'system' AND $1::uuid IS NULL) OR (c.owner_type = 'user' AND c.user_id = $1)
     GROUP BY c.id
     ORDER BY is_favorited DESC, due_count DESC, c.name`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    topicColor: isTopicColor(r.topic_color) ? r.topic_color : null,
    isPublic: r.owner_type === "user" ? true : Boolean(r.is_public),
    isFavorited: r.is_favorited,
    deckCount: r.deck_count,
    cardCount: r.card_count,
    newCount: r.new_count,
    learningCount: r.learning_count,
    reviewCount: r.review_count,
    knownCount: r.known_count,
    dueCount: r.due_count,
  }));
}

// ============================================================
// From the library — every system topic, directly studyable
// ============================================================

// Same shape/query as getDashboardTopicTiles, scoped to system topics
// unconditionally (signed-in or not) instead of by ownership. No
// "add" step: a library topic tile links straight to its own page
// (same as a "Your topics" tile), where studying it writes real
// progress against the original cards — nothing is copied.
export async function getLibraryTopicTiles(userId: string | null): Promise<TopicTile[]> {
  const { rows } = await pool.query(
    `SELECT c.id, c.name, c.topic_color, c.subject, c.is_public,
       EXISTS (SELECT 1 FROM flashcard_category_favorite fav WHERE fav.category_id = c.id AND fav.user_id = $1) AS is_favorited,
       COUNT(DISTINCT d.id)::int AS deck_count,
       COUNT(f.id)::int AS card_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.state IS NULL OR p.state = 'new'))::int AS new_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'learning')::int AS learning_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review')::int AS review_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known_count,
       COUNT(*) FILTER (WHERE f.id IS NOT NULL AND (p.due_at IS NULL OR p.due_at <= now()))::int AS due_count,
       (SELECT array_agg(t.name) FROM (SELECT name FROM flashcard_deck WHERE category_id = c.id AND status = 'published' AND archived_at IS NULL ORDER BY position LIMIT 3) t) AS sample_deck_titles
     FROM flashcard_category c
     LEFT JOIN flashcard_deck d ON d.category_id = c.id AND d.status = 'published' AND d.archived_at IS NULL
     LEFT JOIN flashcard f ON f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
     LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
     WHERE c.owner_type = 'system'
     GROUP BY c.id
     ORDER BY is_favorited DESC, due_count DESC, c.name`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    topicColor: isTopicColor(r.topic_color) ? r.topic_color : null,
    subject: isFlashcardSubject(r.subject) ? r.subject : "other",
    isPublic: Boolean(r.is_public),
    isFavorited: r.is_favorited,
    deckCount: r.deck_count,
    cardCount: r.card_count,
    newCount: r.new_count,
    learningCount: r.learning_count,
    reviewCount: r.review_count,
    knownCount: r.known_count,
    dueCount: r.due_count,
    sampleDeckTitles: r.sample_deck_titles ?? [],
  }));
}

export interface LibrarySubjectGroup {
  subject: FlashcardSubject;
  topics: TopicTile[];
  topicCount: number;
  cardCount: number;
}

// Groups getLibraryTopicTiles's flat list by subject in JS — a pure
// transform over the one query's rows, not a second DB round trip
// (FLASHCARDS-SPEC.md: "Counts come from one grouped query"). Fixed
// SUBJECT_ORDER, and a subject with no topics simply doesn't appear —
// there's nothing to separate.
export function groupLibraryTopicsBySubject(topics: TopicTile[]): LibrarySubjectGroup[] {
  const groups = new Map<FlashcardSubject, TopicTile[]>();
  for (const topic of topics) {
    const subject = topic.subject ?? "other";
    const existing = groups.get(subject);
    if (existing) existing.push(topic);
    else groups.set(subject, [topic]);
  }
  return SUBJECT_ORDER.filter((subject) => groups.has(subject)).map((subject) => {
    const subjectTopics = groups.get(subject)!;
    return {
      subject,
      topics: subjectTopics,
      topicCount: subjectTopics.length,
      cardCount: subjectTopics.reduce((sum, t) => sum + t.cardCount, 0),
    };
  });
}

// Editor-only — same ownership guard as updateCategoryTopicColor, but
// subject is only ever set on system topics in the UI (only they group
// into "Browse the library"); the guard stays symmetric with the other
// category-field updaters rather than hard-coding that assumption here.
export async function updateCategorySubject(
  userId: string,
  categoryId: string,
  subject: FlashcardSubject,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_category SET subject = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [subject, categoryId, userId, isEditor]
  );
}

// A "user" folder 404s (returns null) for anyone but its owner — same
// ownership-checked idiom as getDeckWithCards, so a forged id from
// another member's private folder leaks nothing. A "system" folder
// always resolves.
export async function getCategoryWithDecks(
  categoryId: string,
  userId: string | null
): Promise<{ category: FlashcardCategory; decks: DeckSummary[] } | null> {
  const { rows: categoryRows } = await pool.query(
    `SELECT c.id, c.owner_type, c.user_id, c.name, c.color, c.topic_color, c.subject, c.icon, c.is_public,
       (SELECT COUNT(*) FROM flashcard_deck d WHERE d.category_id = c.id AND d.status = 'published' AND d.archived_at IS NULL) AS deck_count
     FROM flashcard_category c
     WHERE c.id = $1`,
    [categoryId]
  );
  const categoryRow = categoryRows[0];
  if (!categoryRow) return null;
  if (categoryRow.owner_type === "user" && categoryRow.user_id !== userId) return null;

  const masteredSelect = userId
    ? `, (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $2
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL AND p.box >= ${MASTERY_BOX}
       ) AS mastered_count,
       (
         SELECT COUNT(*) FROM flashcard f
         JOIN flashcard_progress p ON p.flashcard_id = f.id AND p.user_id = $2
         WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL
       ) AS started_count`
    : `, NULL::bigint AS mastered_count, NULL::bigint AS started_count`;

  const { rows: deckRows } = await pool.query(
    `SELECT d.id, d.owner_type, d.name, d.description, d.color, d.icon_url,
       d.category_id, c.name AS category_name, c.icon AS category_icon,
       (SELECT COUNT(*) FROM flashcard f WHERE f.deck_id = d.id AND f.status = 'published' AND f.deleted_at IS NULL) AS card_count
       ${masteredSelect}
     FROM flashcard_deck d
     JOIN flashcard_category c ON c.id = d.category_id
     WHERE d.category_id = $1 AND d.status = 'published' AND d.archived_at IS NULL
     ORDER BY d.position, d.name`,
    userId ? [categoryId, userId] : [categoryId]
  );

  return {
    category: mapCategoryRow(categoryRow),
    decks: deckRows.map(mapDeckSummaryRow),
  };
}

export async function createCategory(
  ownerType: DeckOwnerType,
  userId: string | null,
  name: string,
  color: CardColor
): Promise<FlashcardCategory> {
  const { rows: siblingRows } = await pool.query<{ topic_color: string | null }>(
    `SELECT topic_color FROM flashcard_category
     WHERE owner_type = $1 AND ($1 = 'system' OR user_id = $2)`,
    [ownerType, userId]
  );
  // "Assign a free one on creation" (FLASHCARDS-SPEC.md) — scoped the
  // same way the position count above is: system topics compete for a
  // free color against other system topics, a member's own topics
  // against only their own.
  const topicColor = pickFreeTopicColor(siblingRows.map((r) => r.topic_color as TopicColor | null));
  const { rows } = await pool.query(
    `INSERT INTO flashcard_category (owner_type, user_id, name, color, topic_color, position)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, owner_type, name, color, topic_color, icon`,
    [ownerType, userId, name, color, topicColor, siblingRows.length]
  );
  return mapCategoryRow({ ...rows[0], deck_count: "0" });
}

// isEditor widens the ownership check to also match any system folder
// — same idiom as renameDeck. A member who isn't an editor only ever
// matches their own user-owned folders.
export async function renameCategory(
  userId: string,
  categoryId: string,
  name: string,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_category SET name = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [name, categoryId, userId, isEditor]
  );
}

export async function updateCategoryColor(
  userId: string,
  categoryId: string,
  color: CardColor,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_category SET color = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [color, categoryId, userId, isEditor]
  );
}

// "let the user change it" (FLASHCARDS-SPEC.md) — same ownership guard
// as updateCategoryColor above, just against the topic_color column.
export async function updateCategoryTopicColor(
  userId: string,
  categoryId: string,
  topicColor: TopicColor,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_category SET topic_color = $1
     WHERE id = $2 AND ((owner_type = 'user' AND user_id = $3) OR (owner_type = 'system' AND $4))`,
    [topicColor, categoryId, userId, isEditor]
  );
}

// Decks in this folder aren't deleted — category_id just falls back to
// NULL (ON DELETE SET NULL) and they keep showing up in the plain
// deck grid below the folder row, uncategorized.
export async function deleteCategory(userId: string, categoryId: string, isEditor: boolean): Promise<void> {
  await pool.query(
    `DELETE FROM flashcard_category
     WHERE id = $1 AND ((owner_type = 'user' AND user_id = $2) OR (owner_type = 'system' AND $3))`,
    [categoryId, userId, isEditor]
  );
}

// Both the deck and the target category must belong to the same owner
// (a member's own deck can only go in that same member's own folder;
// a preset deck can only go in a system folder, editor/admin-only) —
// enforced in one WHERE clause rather than two round-trips, so a
// forged pairing (someone else's deck into your folder, or vice
// versa) simply matches no row instead of needing a separate check.
// categoryId: null removes the deck from whatever folder it's in,
// gated only by the deck's own ownership.
export async function setDeckCategory(
  userId: string,
  deckId: string,
  categoryId: string | null,
  isEditor: boolean
): Promise<void> {
  await pool.query(
    `UPDATE flashcard_deck d SET category_id = $1::uuid
     WHERE d.id = $2
       AND ((d.owner_type = 'user' AND d.user_id = $3) OR (d.owner_type = 'system' AND $4))
       AND ($1::uuid IS NULL OR EXISTS (
         SELECT 1 FROM flashcard_category c
         WHERE c.id = $1::uuid
           AND ((c.owner_type = 'user' AND c.user_id = $3 AND d.owner_type = 'user')
             OR (c.owner_type = 'system' AND $4 AND d.owner_type = 'system'))
       ))`,
    [categoryId, deckId, userId, isEditor]
  );
}

// ============================================================
// Your progress — the three panels + progress-by-topic
// (FLASHCARDS-SPEC.md "The dashboard — final order")
// ============================================================

const MILESTONE_STEP = 50;
const RETENTION_MIN_ANSWERS = 20; // "Retention needs at least 20 review answers before it appears at all" (FLASHCARDS-DASHBOARD-STATES.md)
const REVIEW_VOLUME_WEEKS = 16;
const STUDY_DAYS_WINDOW = 84;

// Monday-start week boundary, matching Postgres's date_trunc('week', ...)
// (ISO weeks) — so the JS-side week keys line up with the SQL-side ones
// without a second round trip per week.
function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + ((day === 0 ? -6 : 1) - day));
  return d;
}

export interface ProgressWhatYouKnow {
  knownCount: number;
  totalCards: number;
  knownPercent: number;
  learningCount: number;
  notStartedCount: number;
  // Cards that crossed the known threshold (flashcard-sm2's 21-day
  // interval) for the first time this calendar month — derived from
  // the review log's own before/after intervals, not a snapshot, so
  // it's exact rather than inferred from "reviewed recently".
  knownThisMonth: number;
  milestoneTarget: number;
  milestoneRemaining: number;
  milestoneSessions: number;
}

// null when the visitor has no cards at all (system + owned) — "never
// show a statistic with no data" (FLASHCARDS-DASHBOARD-STATES.md rule 1).
export async function getProgressWhatYouKnow(userId: string): Promise<ProgressWhatYouKnow | null> {
  const [countRows, monthRows, activeDaysRows] = await Promise.all([
    pool.query<{ total: string; known: string; learning: string }>(
      `SELECT
         COUNT(f.id)::int AS total,
         COUNT(*) FILTER (WHERE p.state = 'review' AND p.interval_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS})::int AS known,
         COUNT(*) FILTER (WHERE p.state = 'learning' OR (p.state = 'review' AND p.interval_days < ${KNOWN_INTERVAL_THRESHOLD_DAYS}))::int AS learning
       FROM flashcard f
       JOIN flashcard_deck d ON d.id = f.deck_id AND d.status = 'published' AND d.archived_at IS NULL
       LEFT JOIN flashcard_sm2_progress p ON p.flashcard_id = f.id AND p.user_id = $1
       WHERE (d.owner_type = 'system' OR d.user_id = $1) AND f.status = 'published' AND f.deleted_at IS NULL`,
      [userId]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
       FROM flashcard_review_log rl
       WHERE rl.user_id = $1 AND rl.reviewed_at >= date_trunc('month', now())
         AND rl.interval_after_days >= ${KNOWN_INTERVAL_THRESHOLD_DAYS}
         AND COALESCE(rl.interval_before_days, 0) < ${KNOWN_INTERVAL_THRESHOLD_DAYS}`,
      [userId]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(DISTINCT (reviewed_at AT TIME ZONE 'UTC')::date)::int AS count
       FROM flashcard_review_log WHERE user_id = $1`,
      [userId]
    ),
  ]);

  const total = Number(countRows.rows[0]?.total ?? 0);
  if (total === 0) return null;

  const known = Number(countRows.rows[0].known);
  const learning = Number(countRows.rows[0].learning);
  const knownThisMonth = Number(monthRows.rows[0]?.count ?? 0);
  const activeDays = Number(activeDaysRows.rows[0]?.count ?? 0);

  const milestoneTarget = known % MILESTONE_STEP === 0 ? known + MILESTONE_STEP : Math.ceil(known / MILESTONE_STEP) * MILESTONE_STEP;
  const milestoneRemaining = milestoneTarget - known;
  const avgKnownPerActiveDay = activeDays === 0 ? 0 : known / activeDays;
  const milestoneSessions = avgKnownPerActiveDay <= 0 ? milestoneRemaining : Math.max(1, Math.ceil(milestoneRemaining / avgKnownPerActiveDay));

  return {
    knownCount: known,
    totalCards: total,
    knownPercent: Math.round((known / total) * 100),
    learningCount: learning,
    notStartedCount: total - known - learning,
    knownThisMonth,
    milestoneTarget,
    milestoneRemaining,
    milestoneSessions,
  };
}

export interface ProgressReviewVolume {
  // REVIEW_VOLUME_WEEKS entries, oldest first, last entry = this week.
  weeklyCounts: number[];
  totalReviews: number;
  weeklyAverage: number;
  // JS Date.getDay() convention (0 = Sunday) — the UI formats it via
  // next-intl's own weekday formatting rather than a hardcoded label.
  bestWeekdayIndex: number | null;
}

// null when the visitor has never logged a single review — nothing to
// chart yet.
export async function getProgressReviewVolume(userId: string): Promise<ProgressReviewVolume | null> {
  const [totalRows, weekRows, weekdayRows] = await Promise.all([
    pool.query<{ count: string }>(`SELECT COUNT(*)::int AS count FROM flashcard_review_log WHERE user_id = $1`, [userId]),
    pool.query<{ week_start: string; count: string }>(
      `SELECT date_trunc('week', reviewed_at)::date::text AS week_start, COUNT(*)::int AS count
       FROM flashcard_review_log
       WHERE user_id = $1 AND reviewed_at >= now() - interval '${REVIEW_VOLUME_WEEKS} weeks'
       GROUP BY week_start`,
      [userId]
    ),
    pool.query<{ dow: number; count: string }>(
      `SELECT EXTRACT(DOW FROM reviewed_at)::int AS dow, COUNT(*)::int AS count
       FROM flashcard_review_log WHERE user_id = $1
       GROUP BY dow ORDER BY count DESC LIMIT 1`,
      [userId]
    ),
  ]);

  const totalReviews = Number(totalRows.rows[0]?.count ?? 0);
  if (totalReviews === 0) return null;

  const byWeek = new Map(weekRows.rows.map((r) => [r.week_start, Number(r.count)]));
  const thisWeekStart = startOfIsoWeek(new Date());
  const weeklyCounts: number[] = [];
  for (let i = REVIEW_VOLUME_WEEKS - 1; i >= 0; i--) {
    const d = new Date(thisWeekStart);
    d.setUTCDate(d.getUTCDate() - i * 7);
    weeklyCounts.push(byWeek.get(d.toISOString().slice(0, 10)) ?? 0);
  }

  return {
    weeklyCounts,
    totalReviews,
    weeklyAverage: Math.round(weeklyCounts.reduce((a, b) => a + b, 0) / REVIEW_VOLUME_WEEKS),
    bestWeekdayIndex: weekdayRows.rows[0] ? Number(weekdayRows.rows[0].dow) : null,
  };
}

export interface ProgressRetention {
  // null unless the trailing-30-day window has at least
  // RETENTION_MIN_ANSWERS review-state answers.
  retentionPercent: number | null;
  // null unless both the trailing and the prior 30-day windows clear
  // the same threshold — comparing a real rate to a fabricated one
  // would be a fake trend.
  retentionChangePts: number | null;
  // STUDY_DAYS_WINDOW entries, oldest first, today last.
  studyDayCounts: { date: string; count: number }[];
  currentStreak: number;
  bestStreak: number;
  daysStudiedOutOf84: number;
  // The earliest day this visitor has any review logged, within the
  // lookback window queried — powers "since your first review, X ago".
  firstStudyDay: string | null;
}

// null when there's no review history at all — nothing to show for
// either the heatmap or the streak line.
export async function getProgressRetention(userId: string, todayYmd: string): Promise<ProgressRetention | null> {
  const [recentRows, priorRows, dayRows] = await Promise.all([
    pool.query<{ total: string; correct: string }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE grade != 'again')::int AS correct
       FROM flashcard_review_log
       WHERE user_id = $1 AND state_before = 'review' AND reviewed_at > now() - interval '30 days'`,
      [userId]
    ),
    pool.query<{ total: string; correct: string }>(
      `SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE grade != 'again')::int AS correct
       FROM flashcard_review_log
       WHERE user_id = $1 AND state_before = 'review'
         AND reviewed_at <= now() - interval '30 days' AND reviewed_at > now() - interval '60 days'`,
      [userId]
    ),
    pool.query<{ day: string; count: string }>(
      `SELECT (reviewed_at AT TIME ZONE 'UTC')::date::text AS day, COUNT(*)::int AS count
       FROM flashcard_review_log
       WHERE user_id = $1 AND reviewed_at >= now() - interval '400 days'
       GROUP BY day`,
      [userId]
    ),
  ]);

  if (dayRows.rows.length === 0) return null;

  const dayCountMap = new Map(dayRows.rows.map((r) => [r.day, Number(r.count)]));
  const allDays = [...dayCountMap.keys()].sort();

  let currentStreak = 0;
  const cursor = new Date(`${todayYmd}T00:00:00Z`);
  while (dayCountMap.has(cursor.toISOString().slice(0, 10))) {
    currentStreak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  let bestStreak = 0;
  let run = 0;
  let prevDay: Date | null = null;
  for (const day of allDays) {
    const d = new Date(`${day}T00:00:00Z`);
    run = prevDay && d.getTime() - prevDay.getTime() === 86400000 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prevDay = d;
  }

  const studyDayCounts: { date: string; count: number }[] = [];
  const start = new Date(`${todayYmd}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - (STUDY_DAYS_WINDOW - 1));
  let daysStudiedOutOf84 = 0;
  for (let i = 0; i < STUDY_DAYS_WINDOW; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    const count = dayCountMap.get(key) ?? 0;
    if (count > 0) daysStudiedOutOf84 += 1;
    studyDayCounts.push({ date: key, count });
  }

  const recentTotal = Number(recentRows.rows[0]?.total ?? 0);
  const priorTotal = Number(priorRows.rows[0]?.total ?? 0);
  const retentionPercent =
    recentTotal < RETENTION_MIN_ANSWERS ? null : Math.round((Number(recentRows.rows[0].correct) / recentTotal) * 100);
  const priorRetention =
    priorTotal < RETENTION_MIN_ANSWERS ? null : Math.round((Number(priorRows.rows[0].correct) / priorTotal) * 100);

  return {
    retentionPercent,
    retentionChangePts: retentionPercent !== null && priorRetention !== null ? retentionPercent - priorRetention : null,
    studyDayCounts,
    currentStreak,
    bestStreak,
    daysStudiedOutOf84,
    firstStudyDay: allDays[0] ?? null,
  };
}

export interface DashboardProgress {
  whatYouKnow: ProgressWhatYouKnow | null;
  reviewVolume: ProgressReviewVolume | null;
  retention: ProgressRetention | null;
}

export async function getDashboardProgress(userId: string, todayYmd: string): Promise<DashboardProgress> {
  const [whatYouKnow, reviewVolume, retention] = await Promise.all([
    getProgressWhatYouKnow(userId),
    getProgressReviewVolume(userId),
    getProgressRetention(userId, todayYmd),
  ]);
  return { whatYouKnow, reviewVolume, retention };
}
