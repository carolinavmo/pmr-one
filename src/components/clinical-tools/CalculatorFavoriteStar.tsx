"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { toggleCalculatorFavoriteAction } from "@/lib/actions/workspace";

// TOOLS-IMPLEMENTATION.md Pass 4 point 1 — "Star toggles on the card
// and in the tool page header." Same form-action shape as the card's
// own star (CalculatorCard.tsx) and DiseaseHeader.tsx's FavoriteToggle
// — after the Server Action commits, Next.js re-renders this route
// segment from the fresh `isFavorited` prop, so it and the card(s) on
// the dashboard grid (a separate route/cache segment revalidated by
// the same action) stay in sync without any client-side shared state.
export function CalculatorFavoriteStar({
  calculatorId,
  isFavorited,
}: {
  calculatorId: string;
  isFavorited: boolean;
}) {
  const t = useTranslations("clinicalTools");
  return (
    <form action={toggleCalculatorFavoriteAction} className="contents">
      <input type="hidden" name="calculatorId" value={calculatorId} />
      <button
        type="submit"
        aria-pressed={isFavorited}
        aria-label={isFavorited ? t("removeFromFavourites") : t("addToFavourites")}
        className="flex size-8 items-center justify-center text-xl transition-colors duration-base"
        style={{ color: isFavorited ? "var(--cat-favourites-c)" : "#C6CED8" }}
      >
        <Star className="size-5" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
      </button>
    </form>
  );
}
