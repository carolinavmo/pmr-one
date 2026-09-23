"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import type { LinkedDiseaseSummary } from "@/lib/atlas";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";
import { searchLibraryPagesAction } from "@/lib/actions/library-pull";

// HANDBOOK-SPEC.md Pass 4's "Library link" — a small search-and-pick
// modal over the disease catalog.
export function AtlasLibraryLinkPicker({
  linkedDisease,
  onClose,
  onPick,
  onRemove,
}: {
  linkedDisease: LinkedDiseaseSummary | null;
  onClose: () => void;
  onPick: (diseaseId: string) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("myAtlas");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiseaseCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: flips to a loading state before the search action resolves, same pattern the picker's own results-set below uses inside the .then()
    setLoading(true);
    searchLibraryPagesAction(query).then((r) => {
      if (!cancelled) {
        setResults(r);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

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
            placeholder={t("chooseLibraryPage")}
            className="min-w-0 flex-1 bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
          />
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        {linkedDisease && (
          <button
            type="button"
            onClick={onRemove}
            className="border-b border-border px-3 py-2 text-left font-ui text-xs font-bold text-warning hover:bg-warning/5"
          >
            {t("removeLibraryLink")}
          </button>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {loading ? null : results.length === 0 ? (
            <p className="px-2.5 py-4 text-center font-ui text-sm text-secondary">{t("noLibraryResults")}</p>
          ) : (
            results.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onPick(d.id)}
                className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left hover:bg-border/30"
              >
                <span className="font-ui text-sm font-bold text-primary">{d.canonicalName}</span>
                <span className="line-clamp-1 font-ui text-xs text-secondary">{d.snippet}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
