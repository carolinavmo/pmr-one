import { useTranslations } from "next-intl";
import { Layers, Flame } from "lucide-react";

// Slim title strip + three account-wide stat chips (streak/retention/
// cards) — the session panel below already owns today's due/split/
// forecast, so this header stays to identity-level numbers, same
// "known % implemented once, reused everywhere" discipline as the
// rest of this feature applied to its own figures.
export function FlashcardsHeader({
  streak,
  retentionPercent,
  totalCards,
}: {
  // null for a signed-out visitor — no session to score a streak or
  // retention against, so those two chips are left out rather than
  // showing a fabricated 0.
  streak: number | null;
  retentionPercent: number | null;
  totalCards: number;
}) {
  const t = useTranslations("flashcards");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Layers className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-heading text-3xl text-primary">{t("pageTitle")}</h1>
          <p className="mt-1 font-ui text-sm text-secondary">{t("pageSubtitle")}</p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {streak !== null && (
          <>
            <div className="flex items-center gap-1.5">
              <Flame className="size-4 text-[#E8564B]" aria-hidden="true" />
              <span className="font-heading text-lg font-black text-navy tabular-nums">{streak}</span>
              <span className="font-ui text-xs text-secondary">{t("streakLabel")}</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="font-heading text-lg font-black text-navy tabular-nums">{retentionPercent === null ? "—" : `${retentionPercent}%`}</span>
              <span className="font-ui text-[11px] text-secondary">{t("retentionHere")}</span>
            </div>
          </>
        )}
        <div className="flex flex-col items-start">
          <span className="font-heading text-lg font-black text-navy tabular-nums">{totalCards}</span>
          <span className="font-ui text-[11px] text-secondary">{t("statsTotalCards")}</span>
        </div>
      </div>
    </div>
  );
}
