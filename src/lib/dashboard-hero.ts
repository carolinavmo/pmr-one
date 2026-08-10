import { pool } from "@/lib/db";
import type { CardColor } from "@/lib/editorial-blocks";
import type { CardIconName } from "@/components/ui/cardIcons";

export interface DashboardHeroCard {
  label: string;
  value: string;
  icon: CardIconName | null;
  color: CardColor;
}

export interface DashboardHero {
  headline: string;
  subtitle: string;
  backgroundImageUrl: string | null;
  backgroundScrim: boolean;
  cards: DashboardHeroCard[];
}

// Singleton row (id always 1, seeded by migration 0019) — no "does it
// exist" branch needed on read, same guarantee the migration's INSERT
// already established.
export async function getDashboardHero(): Promise<DashboardHero> {
  const { rows } = await pool.query(
    `SELECT headline, subtitle, background_image_url, background_scrim, cards FROM dashboard_hero WHERE id = 1`,
  );
  const row = rows[0];
  return {
    headline: row.headline,
    subtitle: row.subtitle,
    backgroundImageUrl: row.background_image_url,
    backgroundScrim: row.background_scrim,
    cards: row.cards as DashboardHeroCard[],
  };
}
