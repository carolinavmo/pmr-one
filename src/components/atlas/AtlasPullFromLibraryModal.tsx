"use client";

import { useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Search, X, ChevronLeft } from "lucide-react";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";
import type { LibraryPullPage } from "@/lib/library-pull";
import { searchLibraryPagesAction, getLibraryPullPageAction } from "@/lib/actions/library-pull";

// HANDBOOK-SPEC.md Pass 5 — "the feature that makes this a handbook
// rather than a notes app." Two steps in one modal: search → pick a
// disease, then pick a section from that disease to quote. Calculator
// results are explicitly NOT wired here — Clinical Tools scores live
// only in CalculatorRunner's own local React state (confirmed no
// persistence anywhere), so there is no stored score anywhere this
// picker could read one from. Per the implementation doc's own
// instruction ("otherwise leave a hook and tell me"): this is that
// note, not a silent omission.
export function AtlasPullFromLibraryModal({
  onClose,
  onInsert,
}: {
  onClose: () => void;
  onInsert: (html: string) => void;
}) {
  const t = useTranslations("myAtlas");
  const format = useFormatter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiseaseCatalogEntry[]>([]);
  const [selected, setSelected] = useState<LibraryPullPage | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    if (selected) return;
    let cancelled = false;
    searchLibraryPagesAction(query).then((r) => {
      if (!cancelled) setResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [query, selected]);

  async function pickDisease(slug: string) {
    setLoadingSections(true);
    const page = await getLibraryPullPageAction(slug);
    setSelected(page);
    setLoadingSections(false);
  }

  function insertSection(sectionId: string) {
    if (!selected) return;
    const section = selected.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const attribution = selected.reviewedAt
      ? t("quotedFrom", { page: selected.diseaseName, section: section.heading, date: format.dateTime(new Date(selected.reviewedAt), { year: "numeric", month: "short" }) })
      : t("quotedFromNoDate", { page: selected.diseaseName, section: section.heading });
    const html = `<blockquote data-disease-id="${selected.diseaseId}" data-disease-slug="${selected.diseaseSlug}" data-section-title="${section.heading}">${section.quoteHtml}<p><i>${attribution}</i></p></blockquote>`;
    onInsert(html);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-navy/40 pt-20" onClick={onClose}>
      <div
        className="flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border p-3">
          {selected ? (
            <button type="button" onClick={() => setSelected(null)} aria-label={t("backToSearch")} title={t("backToSearch")} className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40">
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <Search className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          )}
          {selected ? (
            <span className="min-w-0 flex-1 truncate font-ui text-sm font-bold text-primary">{selected.diseaseName}</span>
          ) : (
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchLibraryPlaceholder")}
              className="min-w-0 flex-1 bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
            />
          )}
          <button type="button" onClick={onClose} aria-label={t("close")} className="flex size-7 shrink-0 items-center justify-center rounded-full text-secondary hover:bg-border/40">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-1.5">
          {!selected ? (
            results.length === 0 ? (
              <p className="px-2.5 py-4 text-center font-ui text-sm text-secondary">{t("noLibraryResults")}</p>
            ) : (
              results.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => pickDisease(d.slug)}
                  className="flex w-full flex-col gap-0.5 rounded-lg px-2.5 py-2 text-left hover:bg-border/30"
                >
                  <span className="font-ui text-sm font-bold text-primary">{d.canonicalName}</span>
                  <span className="line-clamp-1 font-ui text-xs text-secondary">{d.snippet}</span>
                </button>
              ))
            )
          ) : loadingSections ? null : selected.sections.length === 0 ? (
            <p className="px-2.5 py-4 text-center font-ui text-sm text-secondary">{t("noLibraryResults")}</p>
          ) : (
            <>
              <p className="px-2.5 pt-1 pb-1.5 font-ui text-[11px] font-black tracking-wide text-secondary uppercase">
                {t("chooseSectionPrompt")}
              </p>
              {selected.sections.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => insertSection(s.id)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left font-ui text-sm font-bold text-primary hover:bg-border/30"
                >
                  {s.heading}
                  <span className="shrink-0 font-ui text-xs font-bold text-acc-ink">{t("insertQuote")}</span>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
