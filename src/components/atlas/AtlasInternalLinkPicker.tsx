"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { AtlasPage } from "@/lib/atlas";

// HANDBOOK-IMPLEMENTATION.md Pass 4.3 — "Linked from" needs a way to
// actually create the internal links it displays ("requires storing
// internal links as node attributes, not raw URLs"). `pages` is
// already loaded client-side (threaded down for the template-lineage
// box), so this filters in memory rather than round-tripping like
// AtlasLibraryLinkPicker's disease search does.
export function AtlasInternalLinkPicker({
  pages,
  excludePageId,
  onClose,
  onPick,
}: {
  pages: AtlasPage[];
  excludePageId: string;
  onClose: () => void;
  onPick: (pageId: string, title: string) => void;
}) {
  const t = useTranslations("myAtlas");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = pages
    .filter((p) => p.id !== excludePageId)
    .filter((p) => !q || p.title.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy/40 pt-24" onClick={onClose}>
      <div
        className="flex max-h-[60vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("chooseHandbookPage")}
            className="min-w-0 flex-1 bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
          />
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-2.5 py-4 text-center font-ui text-sm text-secondary">{t("noLibraryResults")}</p>
          ) : (
            results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id, p.title)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-ui text-sm font-bold text-primary hover:bg-border/30"
              >
                {p.title || t("untitledPage")}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
