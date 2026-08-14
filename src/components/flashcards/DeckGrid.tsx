import type { ReactNode } from "react";
import type { DeckSummary } from "@/lib/flashcards";
import { DeckCard } from "./DeckCard";

export function DeckGrid({ decks, trailing }: { decks: DeckSummary[]; trailing?: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
      {trailing}
    </div>
  );
}
