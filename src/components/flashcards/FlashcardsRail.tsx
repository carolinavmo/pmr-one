import { useTranslations } from "next-intl";
import { Plus, Search, Star, FolderPlus, CalendarCheck, LayoutGrid, Lock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { FlashcardCategory } from "@/lib/flashcards";
import { MacFolderIcon } from "@/components/ui/MacFolderIcon";
import type { CardColor } from "@/lib/editorial-blocks";

// The 252px rail (FLASHCARDS-SPEC.md Pass 4 rule 4: "the rail is the
// deck index, not the library tree") — replaces SidebarFrame's normal
// library-tree sidebar on this exact route (SidebarFrame.tsx hides
// itself here the same way it already does for My Handbook's own
// index rail: "no sidebar slot at all — its own rail lives inside the
// page content itself").
export function FlashcardsRail({
  query,
  onQueryChange,
  onNewDeckClick,
  onNewFolderClick,
  dueToday,
  favoritedCount,
  systemCategories,
  userCategories,
  folderDueBadges,
  isSignedIn,
  isEditor,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onNewDeckClick: () => void;
  onNewFolderClick: () => void;
  dueToday: number;
  favoritedCount: number;
  systemCategories: FlashcardCategory[];
  userCategories: FlashcardCategory[];
  folderDueBadges: Record<string, number>;
  isSignedIn: boolean;
  isEditor: boolean;
}) {
  const t = useTranslations("flashcards");
  const folders = [...systemCategories, ...userCategories];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[252px]">
      {isSignedIn ? (
        <button
          type="button"
          onClick={onNewDeckClick}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-3 py-2.5 font-ui text-sm font-bold text-white hover:bg-accent-hover"
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("newDeck")}
        </button>
      ) : (
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2.5 font-ui text-sm font-bold text-primary hover:bg-border/40"
        >
          {t("signInLink")}
        </Link>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-secondary" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-full border border-border bg-surface-raised py-2.5 pr-4 pl-10 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      <nav className="flex flex-col gap-0.5">
        <Link href="/flashcards/study" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
          <CalendarCheck className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("dueToday")}
          {dueToday > 0 && <span className="ml-auto rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{dueToday}</span>}
        </Link>
        <span className="flex items-center gap-2.5 rounded-lg bg-border/30 px-2.5 py-2 font-ui text-sm font-bold text-primary">
          <LayoutGrid className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          {t("allDecks")}
        </span>
        {isSignedIn && (
          <Link href="/flashcards/favourites" className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30">
            <Star className="size-4 shrink-0 text-secondary" aria-hidden="true" />
            {t("favourites")}
            <span className="ml-auto font-ui text-xs font-normal text-secondary">{favoritedCount}</span>
          </Link>
        )}
      </nav>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between px-2.5">
          <span className="font-ui text-xs font-medium text-secondary">{t("myFolders")}</span>
          {(isEditor || isSignedIn) && (
            <button type="button" onClick={onNewFolderClick} aria-label={t("newFolder")} className="text-secondary hover:text-accent">
              <FolderPlus className="size-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {folders.length === 0 ? (
            <p className="px-2.5 font-ui text-xs text-secondary">{t("noFoldersYet")}</p>
          ) : (
            folders.map((cat) => {
              const isLocked = !cat.isPublic && !isSignedIn;
              const due = folderDueBadges[cat.id] ?? 0;
              return (
                <Link
                  key={cat.id}
                  href={`/flashcards/category/${cat.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-ui text-sm font-bold text-primary hover:bg-border/30"
                >
                  <MacFolderIcon color={(isLocked ? "slate" : cat.color) as CardColor} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{cat.name}</span>
                  {isLocked ? (
                    <Lock className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
                  ) : (
                    due > 0 && <span className="rounded-full bg-[#E8564B] px-1.5 py-0.5 font-ui text-[10px] font-black text-white">{due}</span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </aside>
  );
}
