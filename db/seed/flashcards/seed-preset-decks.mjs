// Preset (system) flashcard decks — copies of the real self_check
// question/answer pairs already authored on 3 disease pages (see
// LESSONS_LEARNED.md entry #23 for why self_check exists; the source
// text below is copied verbatim from db/seed/achilles-tendinopathy.mjs,
// db/seed/bells-palsy.mjs, and db/seed/knee-osteoarthritis.mjs). This
// is a copy, not a live reference — the disease pages' own self_check
// blocks are untouched by this script.
//
// Usage: node db/seed/flashcards/seed-preset-decks.mjs
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DECKS = [
  {
    diseaseName: "Achilles Tendinopathy",
    name: "Achilles Tendinopathy — Key Concepts",
    description: "Retrieval-practice questions on Achilles tendinopathy.",
    color: "accent",
    cards: [
      {
        question:
          "How do you distinguish mid-portion from insertional Achilles tendinopathy on history?",
        answer:
          "Mid-portion disease presents with pain and thickening 2-6cm above the insertion; insertional disease presents with pain directly at the back of the heel, often aggravated by shoe heel counters.",
      },
      {
        question: "An abnormal (positive) Thompson test suggests what, and how should it change management?",
        answer:
          "Suggests a complete or high-grade partial Achilles tendon rupture, not tendinopathy — this should prompt urgent reassessment rather than continuing routine tendinopathy management.",
      },
      {
        question:
          "Why should corticosteroid injection generally be avoided for Achilles tendinopathy, unlike some other tendinopathies (e.g. plantar fasciopathy)?",
        answer:
          "It carries a real, well-recognized risk of tendon rupture — eccentric loading is preferred as first-line management instead.",
      },
    ],
  },
  {
    diseaseName: "Bell's Palsy",
    name: "Bell's Palsy — Key Concepts",
    description: "Retrieval-practice questions on Bell's Palsy.",
    color: "trust",
    cards: [
      {
        question:
          "What key exam finding distinguishes central (stroke) facial weakness from peripheral (Bell's Palsy) facial weakness?",
        answer:
          "Forehead sparing. If forehead movement is preserved despite lower facial weakness, the lesion is central — most importantly stroke. If the forehead is also weak, the pattern is peripheral, consistent with Bell's Palsy.",
      },
      {
        question: "What does Bell's phenomenon demonstrate, and why does it matter clinically?",
        answer:
          "It shows the normal reflex of the eye rolling upward on attempted closure — the failure of the eyelid to close over it (lagophthalmos) is what creates the corneal exposure risk that drives urgent eye protection.",
      },
      {
        question: "Why should eye protection start the same day, regardless of the steroid-timing decision?",
        answer:
          "Corneal injury from lagophthalmos is a preventable complication, not an inevitable one — it doesn't need to wait on any other treatment decision.",
      },
    ],
  },
  {
    diseaseName: "Knee Osteoarthritis",
    name: "Knee Osteoarthritis — Key Concepts",
    description: "Retrieval-practice questions on knee osteoarthritis.",
    color: "insight",
    cards: [
      {
        question:
          "A patient with knee osteoarthritis has a positive McMurray's test. Does this confirm the osteoarthritis diagnosis?",
        answer:
          "No — a positive McMurray's identifies a commonly co-existing meniscal component, not a competing or confirming finding for osteoarthritis itself. The two frequently occur together without one causing the other.",
      },
      {
        question:
          "A patient has Kellgren-Lawrence grade 3 changes on radiograph but reports only mild pain. How should this be interpreted?",
        answer:
          "Radiographic severity correlates imperfectly with symptom severity — a patient can have advanced imaging findings with mild symptoms, or the reverse. Treat the patient's actual pain and function, not the grade on the film.",
      },
      {
        question: "Why does even modest weight loss have an outsized effect on knee osteoarthritis symptoms?",
        answer:
          "Each pound of body weight is estimated to translate into several times that load across the knee during walking (commonly cited estimates are around 4x) — so a modest reduction in body weight meaningfully reduces joint loading with every step.",
      },
    ],
  },
];

for (const [position, deck] of DECKS.entries()) {
  const { rows: diseaseRows } = await pool.query(
    "SELECT id FROM disease WHERE canonical_name = $1",
    [deck.diseaseName]
  );
  const diseaseId = diseaseRows[0]?.id ?? null;
  if (!diseaseId) {
    console.warn(`Skipping "${deck.name}" — disease "${deck.diseaseName}" not found.`);
    continue;
  }

  const { rows: existingRows } = await pool.query(
    "SELECT id FROM flashcard_deck WHERE owner_type = 'system' AND name = $1",
    [deck.name]
  );
  if (existingRows.length > 0) {
    console.log(`Skipping "${deck.name}" — already seeded.`);
    continue;
  }

  const { rows: deckRows } = await pool.query(
    `INSERT INTO flashcard_deck (owner_type, name, description, color, source_disease_id, position)
     VALUES ('system', $1, $2, $3, $4, $5)
     RETURNING id`,
    [deck.name, deck.description, deck.color, diseaseId, position]
  );
  const deckId = deckRows[0].id;

  for (const [cardPosition, card] of deck.cards.entries()) {
    await pool.query(
      `INSERT INTO flashcard (deck_id, question, answer, position) VALUES ($1, $2, $3, $4)`,
      [deckId, card.question, card.answer, cardPosition]
    );
  }

  console.log(`Seeded "${deck.name}" with ${deck.cards.length} cards.`);
}

await pool.end();
