import { pool } from "@/lib/db";

export interface HomepageHeroCard {
  title: string;
  body: string;
}

export interface HomepageHero {
  title: string;
  subtitle: string;
  cards: HomepageHeroCard[];
}

// Singleton row (id always 1, seeded by migration 0035) — no "does it
// exist" branch needed on read, same guarantee the migration's INSERT
// already established. Mirrors src/lib/dashboard-hero.ts's shape.
export async function getHomepageHero(): Promise<HomepageHero> {
  const { rows } = await pool.query(
    `SELECT title, subtitle, cards FROM homepage_hero WHERE id = 1`,
  );
  const row = rows[0];
  return {
    title: row.title,
    subtitle: row.subtitle,
    cards: row.cards as HomepageHeroCard[],
  };
}
