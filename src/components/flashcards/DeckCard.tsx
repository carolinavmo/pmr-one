import { Layers } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { DeckSummary } from "@/lib/flashcards";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";

export function DeckCard({ deck }: { deck: DeckSummary }) {
  const t = useTranslations("flashcards");
  const masteredPct =
    deck.masteredCount !== null && deck.cardCount > 0
      ? Math.round((deck.masteredCount / deck.cardCount) * 100)
      : null;

  return (
    <Link
      href={`/flashcards/${deck.id}`}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4 transition-colors duration-base hover:border-accent/40"
    >
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[deck.color]}`}>
        <Layers className="size-4.5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <span className="line-clamp-2 font-ui text-sm font-semibold text-primary">{deck.name}</span>
        <span className="font-ui text-xs text-secondary">
          {t("cardCount", { count: deck.cardCount })}
        </span>
      </div>
      {masteredPct !== null && (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40">
            <div className="h-full rounded-full bg-accent" style={{ width: `${masteredPct}%` }} />
          </div>
          <span className="font-ui text-xs text-secondary tabular-nums">{masteredPct}%</span>
        </div>
      )}
    </Link>
  );
}
