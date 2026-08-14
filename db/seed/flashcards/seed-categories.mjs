// One-off backfill for db/migrations/0044_flashcard_categories.sql —
// creates the 3 folders that match the region-derived icon/label the
// 3 real preset decks already displayed before categories existed as
// a stored entity (src/lib/disease-icons.ts's REGION_KEYWORDS), then
// assigns each deck to its folder by name. Run once locally, once
// against production after deploy — same two-step pattern as every
// other seed script in this project.
//
// Usage: node db/seed/flashcards/seed-categories.mjs
import { Pool } from "pg";
import { config } from "dotenv";

config({ path: ".env.local" });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
  { name: "Foot & Ankle", color: "accent", icon: "footprints", deckName: "Achilles Tendinopathy — Key Concepts" },
  { name: "Face", color: "trust", icon: "smile", deckName: "Bell's Palsy — Key Concepts" },
  { name: "Knee & Hip", color: "insight", icon: "bone", deckName: "Knee Osteoarthritis — Key Concepts" },
];

for (let i = 0; i < CATEGORIES.length; i++) {
  const cat = CATEGORIES[i];
  const { rows } = await pool.query(
    `INSERT INTO flashcard_category (name, color, icon, position) VALUES ($1, $2, $3, $4) RETURNING id`,
    [cat.name, cat.color, cat.icon, i]
  );
  const categoryId = rows[0].id;
  const { rowCount } = await pool.query(
    `UPDATE flashcard_deck SET category_id = $1 WHERE name = $2 AND owner_type = 'system'`,
    [categoryId, cat.deckName]
  );
  console.log(`${cat.name}: created category ${categoryId}, assigned ${rowCount} deck(s)`);
}

await pool.end();
