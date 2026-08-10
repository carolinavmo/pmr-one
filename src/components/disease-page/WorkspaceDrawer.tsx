"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { NotebookPen, BookMarked, History, Sparkles, X, LayoutPanelLeft } from "lucide-react";
import { saveNoteAction } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/Button";
import type { RecentlyViewedDisease } from "@/lib/workspace";

interface SavedPearlView {
  id: string;
  html: string;
  diseaseSlug: string | null;
}

interface WorkspaceDrawerProps {
  diseaseId: string;
  diseaseSlug: string;
  note: string | null;
  savedPearls: SavedPearlView[];
  recentlyViewed: RecentlyViewedDisease[];
}

// Same three real capabilities (Notes, Saved Pearls, Recently Viewed)
// plus the one visibly inert placeholder (Ask AI) as before — now a
// slide-in drawer instead of a permanent third column. Two reasons
// this is a net improvement, not just a style change: it gives the
// reading column its width back on desktop (no more reserved 288px),
// and — unlike the old `hidden ... md:flex` column, which had no
// mobile equivalent at all — an overlay works identically at any
// viewport width, so Workspace is now reachable on mobile too.
export function WorkspaceDrawer({
  diseaseId,
  diseaseSlug,
  note,
  savedPearls,
  recentlyViewed,
}: WorkspaceDrawerProps) {
  const t = useTranslations("workspace");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <>
      {/* Edge tab — always reachable, doesn't reserve any layout
          space of its own (fixed positioning). Hidden while the
          drawer itself is open so it doesn't sit underneath it. */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("openMyWorkspace")}
          className="fixed top-1/2 right-0 z-30 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-l-xl bg-accent px-2 py-3 text-white shadow-md transition-colors duration-base hover:bg-accent-hover"
        >
          <LayoutPanelLeft className="size-4" aria-hidden="true" />
          <span className="font-ui text-xs font-medium [writing-mode:vertical-rl]">
            {t("workspaceLabel")}
          </span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label={t("myWorkspace")}
        className={`fixed top-0 right-0 z-50 flex h-full w-80 max-w-[85vw] flex-col gap-3 overflow-y-auto border-l border-border bg-surface p-4 shadow-xl transition-transform duration-base ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-base font-semibold text-primary">{t("myWorkspace")}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("closeMyWorkspace")}
            className="rounded-full p-1.5 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <NotebookPen className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-ui text-sm font-medium text-primary">{t("myNotes")}</span>
              <span className="font-ui text-xs text-secondary">{note ? t("saved") : t("noNoteYet")}</span>
            </div>
          </div>
          <form action={saveNoteAction} className="flex flex-col gap-2">
            <input type="hidden" name="diseaseId" value={diseaseId} />
            <input type="hidden" name="diseaseSlug" value={diseaseSlug} />
            <textarea
              name="body"
              defaultValue={note ?? ""}
              rows={4}
              placeholder={t("notesPlaceholder")}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <Button type="submit" variant="secondary" className="self-start">
              {t("saveNote")}
            </Button>
          </form>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-insight/10 text-insight">
              <BookMarked className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-ui text-sm font-medium text-primary">{tCommon("savedPearls")}</span>
              <span className="font-ui text-xs text-secondary">{tCommon("savedCount", { count: savedPearls.length })}</span>
            </div>
          </div>
          {savedPearls.length === 0 ? (
            <p className="font-ui text-sm text-secondary">{tCommon("bookmarkPearlEmpty")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {savedPearls.map((pearl) => (
                <li key={pearl.id}>
                  {pearl.diseaseSlug ? (
                    <Link
                      href={`/conditions/${pearl.diseaseSlug}`}
                      onClick={() => setOpen(false)}
                      className="line-clamp-2 font-ui text-sm text-primary hover:text-accent"
                      dangerouslySetInnerHTML={{ __html: pearl.html }}
                    />
                  ) : (
                    <span
                      className="line-clamp-2 font-ui text-sm text-primary"
                      dangerouslySetInnerHTML={{ __html: pearl.html }}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-surface-raised p-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <History className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-ui text-sm font-medium text-primary">{t("recentlyViewed")}</span>
              <span className="font-ui text-xs text-secondary">
                {tCommon("conditionCount", { count: recentlyViewed.length })}
              </span>
            </div>
          </div>
          {recentlyViewed.length === 0 ? (
            <p className="font-ui text-sm text-secondary">
              {t("otherConditionsEmpty")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {recentlyViewed.map((disease) => (
                <li key={disease.slug}>
                  <Link
                    href={`/conditions/${disease.slug}`}
                    onClick={() => setOpen(false)}
                    className="font-ui text-sm text-primary hover:text-accent"
                  >
                    {disease.canonicalName}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Visibly inert — an entry point, not a working feature. Real
            LLM integration is a separate, much larger decision. Dashed
            border and muted icon distinguish it from the three working
            cards above, rather than styling it identically and implying
            it's just as real. */}
        <div className="flex flex-col gap-1 rounded-xl border border-dashed border-border p-3.5 opacity-70">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-border/40 text-secondary">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <div className="flex flex-col">
              <span className="font-ui text-sm font-medium text-primary">{t("askAI")}</span>
              <span className="font-ui text-xs text-secondary">{tCommon("comingSoon")}</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
