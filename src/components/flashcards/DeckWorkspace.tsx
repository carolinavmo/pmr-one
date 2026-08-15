"use client";

import { useState } from "react";
import type { FlashcardCard } from "@/lib/flashcards";
import { FlashcardReviewer } from "./FlashcardReviewer";
import { CardManager } from "./CardManager";

// Owns the shared card list so an edit in CardManager (add/edit/
// delete/reorder) shows up in the reviewer immediately, without
// waiting on a full page reload — the previous split (each component
// holding its own copy of the initial server props) meant a newly
// added card was invisible in the reviewer until a manual refresh.
export function DeckWorkspace({
  deckId,
  initialCards,
  isSignedIn,
}: {
  deckId: string;
  initialCards: FlashcardCard[];
  isSignedIn: boolean;
}) {
  const [cards, setCards] = useState(initialCards);

  return (
    <>
      <FlashcardReviewer cards={cards} isSignedIn={isSignedIn} />
      <CardManager deckId={deckId} cards={cards} onCardsChange={setCards} />
    </>
  );
}
