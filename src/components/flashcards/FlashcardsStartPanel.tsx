import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";

// S0 "Nothing yet" (FLASHCARDS-DASHBOARD-STATES.md) — replaces the
// session panel when the visitor owns zero decks: there's no due
// count or forecast to show yet, so the panel's job changes from
// "what's due" to "what to do first". "Add my first topic" anchors
// down to the library grid rather than auto-picking one — that choice
// is the visitor's, not a default to spring on them.
export function FlashcardsStartPanel({ onBuildDeckClick }: { onBuildDeckClick: () => void }) {
  const t = useTranslations("flashcards");

  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-navy-fill p-6 sm:flex-row sm:items-center">
      <div className="flex-1">
        <span className="font-ui text-[10px] font-black tracking-[1.5px] text-[#7FCBD1]">{t("startHereEyebrow")}</span>
        <h2 className="mt-1 font-heading text-2xl leading-tight font-black text-white">{t("startHereTitle")}</h2>
        <p className="mt-2 max-w-[560px] font-ui text-sm text-white/70">{t("startHereBody")}</p>
      </div>

      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
        <a
          href="#add-from-library"
          className="flex items-center justify-center rounded-lg bg-accent px-5 py-3 font-ui text-sm font-black text-white hover:bg-accent-hover"
        >
          {t("addFirstTopic")}
        </a>
        <button
          type="button"
          onClick={onBuildDeckClick}
          className="flex items-center justify-center gap-1.5 rounded-lg border border-white/30 px-4 py-3 font-ui text-xs font-bold text-white hover:bg-white/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          {t("buildADeck")}
        </button>
      </div>
    </div>
  );
}
