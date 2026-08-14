"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { DeckSummary } from "@/lib/flashcards";
import { DeckGrid } from "./DeckGrid";
import { NewDeckDrawer } from "./NewDeckDrawer";

export function MyDecksSection({ decks }: { decks: DeckSummary[] }) {
  const t = useTranslations("flashcards");
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-lg font-semibold text-primary">{t("myDecksHeading")}</h2>
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 font-ui text-sm font-medium text-white hover:bg-accent-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("newDeck")}
        </button>
      </div>
      {decks.length > 0 ? (
        <DeckGrid decks={decks} />
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center font-ui text-sm text-secondary">
          {t("myDecksEmpty")}
        </p>
      )}
      <NewDeckDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}
