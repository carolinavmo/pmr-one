"use client";

import { useRef, useTransition } from "react";
import { ChevronRight, Folder } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import type { LibraryBrowseData, LibraryPageRow } from "@/lib/library-home";
import { LIBRARY_SORT_ORDER, LIBRARY_SORT_LABEL, type LibrarySort } from "@/lib/library-sort";
import { PAGE_TYPE_TAG_CLASS, DISEASE_PAGE_TYPE_LABEL } from "@/lib/disease-page-type";
import { saveLibraryPrefsAction } from "@/lib/actions/library";

function buildHref(params: {
  area?: string | null;
  region?: string | null;
  type?: string | null;
  sort?: LibrarySort;
  hideRead?: boolean;
}): string {
  const search = new URLSearchParams();
  if (params.area) search.set("area", params.area);
  if (params.region) search.set("region", params.region);
  if (params.type) search.set("type", params.type);
  if (params.sort && params.sort !== "reading_order") search.set("sort", params.sort);
  if (params.hideRead) search.set("hideRead", "1");
  const qs = search.toString();
  return `/library${qs ? `?${qs}` : ""}#browse-by-area`;
}

// The 90px bar + label pair — `✓ Read` green (full bar), `N% · M min
// left` accent (partial bar), or the reading time in grey (empty
// track) for a page with no progress at all yet.
function ProgressCell({ progress }: { progress: LibraryPageRow["progress"] }) {
  if (progress.state === "read") {
    return (
      <span className="flex items-center gap-2.5">
        <span className="h-[5px] w-[90px] shrink-0 overflow-hidden rounded-[3px] bg-[#EEF1F5]">
          <span className="block h-[5px] rounded-[3px] bg-[#1F7A4D]" style={{ width: "100%" }} />
        </span>
        <span className="font-ui text-xs font-semibold text-[#1F7A4D]">✓ Read</span>
      </span>
    );
  }
  if (progress.state === "inProgress") {
    return (
      <span className="flex items-center gap-2.5">
        <span className="h-[5px] w-[90px] shrink-0 overflow-hidden rounded-[3px] bg-[#EEF1F5]">
          <span className="block h-[5px] rounded-[3px] bg-acc" style={{ width: `${progress.percent}%` }} />
        </span>
        <span className="font-ui text-xs font-semibold text-acc-ink">
          {progress.percent}% · {progress.minutesLeft} min left
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2.5">
      <span className="h-[5px] w-[90px] shrink-0 rounded-[3px] bg-[#EEF1F5]" />
      <span className="font-ui text-xs font-semibold text-[#9AA5B4]">{progress.readingMinutes} min</span>
    </span>
  );
}

// NEW (accent tint) for a page published in the last 30 days, UPDATED
// (grey) for one reviewed in the last 30 days — never both;
// contentTag is already computed server-side to whichever one wins.
function ContentTag({ tag }: { tag: LibraryPageRow["contentTag"] }) {
  if (!tag) return null;
  return (
    <span
      className={`shrink-0 rounded-[5px] px-1.5 py-px font-ui text-[9.5px] font-black tracking-[0.8px] ${
        tag === "new" ? "bg-acc-bg text-acc-ink" : "bg-[#EEF1F5] text-secondary"
      }`}
    >
      {tag === "new" ? "NEW" : "UPDATED"}
    </span>
  );
}

// Rows a real link (the whole row, not just the title/chevron) —
// title wraps rather than truncates (founder rule), so a long title
// doesn't get a wider hit target than what's visible. Below ~1100px
// the type column drops entirely (Pass 4 responsive rule); progress
// stays since it's the more important column.
function PageRowView({ page }: { page: LibraryPageRow }) {
  return (
    <Link
      href={`/conditions/${page.slug}`}
      className="grid grid-cols-[1fr_140px_20px] items-center gap-3.5 px-[18px] py-2.5 transition-colors duration-base hover:bg-surface-sunken min-[1100px]:grid-cols-[1fr_150px_140px_20px]"
    >
      <span className="flex min-w-0 items-center gap-1.5 pl-5">
        <span className="min-w-0 font-ui text-sm font-extrabold break-words text-navy">{page.title}</span>
        <ContentTag tag={page.contentTag} />
      </span>
      <span className="hidden min-[1100px]:block">
        {page.type && <span className={PAGE_TYPE_TAG_CLASS}>{DISEASE_PAGE_TYPE_LABEL[page.type]}</span>}
      </span>
      <ProgressCell progress={page.progress} />
      <ChevronRight className="size-3.5 justify-self-end font-black text-[#AAB4C1]" aria-hidden="true" />
    </Link>
  );
}

export function BrowseByArea({ data, canPersist }: { data: LibraryBrowseData; canPersist: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function go(next: { area?: string | null; region?: string | null; sort?: LibrarySort; hideRead?: boolean }) {
    const area = next.area !== undefined ? next.area : data.activeArea;
    const region = next.region !== undefined ? next.region : data.activeRegion;
    const sort = next.sort ?? data.sort;
    const hideRead = next.hideRead ?? data.hideRead;
    const href = buildHref({ area, region, type: data.activeType, sort, hideRead });
    // No `scroll: false` — the href's own #browse-by-area fragment is
    // what should drive scroll position here (Next's default handling
    // respects the hash); suppressing scroll entirely would leave the
    // page wherever it happened to be instead of back at this section.
    startTransition(() => router.push(href));
    if (canPersist) saveLibraryPrefsAction({ area: area ?? null, region: region ?? null, sort, hideRead });
  }

  // Roving-tabindex arrow-key navigation (WAI-ARIA APG tabs pattern,
  // automatic activation) — Left/Right moves focus and immediately
  // switches the active area, wrapping at either end.
  function handleTabKeyDown(event: React.KeyboardEvent, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = data.areas[(index + delta + data.areas.length) % data.areas.length];
    tabRefs.current.get(next.key)?.focus();
    go({ area: next.key, region: null });
  }

  return (
    <div id="browse-by-area" className="px-6 pt-7 scroll-mt-20">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-heading text-[19px] font-black tracking-[-0.4px] text-navy">
          Browse by area
        </h2>
        <span className="font-ui text-[13px] text-secondary">{data.totalPages} pages</span>
      </div>

      {data.areas.length === 0 ? (
        <p className="font-ui text-sm text-secondary">No pages are organized into the library tree yet.</p>
      ) : (
        <>
          <div role="tablist" aria-label="Browse by area" className="flex gap-0.5 border-b border-border">
            {data.areas.map((area, index) => {
              const isActive = area.key === data.activeArea;
              return (
                <button
                  key={area.key}
                  ref={(el) => {
                    if (el) tabRefs.current.set(area.key, el);
                  }}
                  role="tab"
                  id={`area-tab-${area.key}`}
                  aria-selected={isActive}
                  aria-controls="browse-by-area-panel"
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                  onClick={() => go({ area: area.key, region: null })}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`-mb-px border-b-[3px] px-3.5 py-2.5 font-ui text-sm font-extrabold ${
                    isActive ? "text-navy" : "border-transparent text-secondary"
                  }`}
                  style={isActive ? { borderBottomColor: area.color ?? "var(--color-navy)" } : undefined}
                >
                  {area.label}
                  <span className="ml-1.5 font-ui text-[11.5px] font-bold text-[#9AA5B4]">{area.count}</span>
                </button>
              );
            })}
          </div>

          <div
            id="browse-by-area-panel"
            role="tabpanel"
            aria-labelledby={data.activeArea ? `area-tab-${data.activeArea}` : undefined}
          >
            <div className="mt-3.5 flex items-center gap-3">
              <div className="flex flex-1 gap-1.5 overflow-x-auto max-[800px]:flex-nowrap max-[800px]:pb-1 min-[801px]:flex-wrap">
                {data.regions.map((region) => {
                  const isActive = region.slug === data.activeRegion;
                  return (
                    <button
                      key={region.slug}
                      type="button"
                      onClick={() => go({ region: region.slug })}
                      aria-pressed={isActive}
                      className={`shrink-0 rounded-[15px] border px-3 py-1.5 font-ui text-[12.5px] font-bold ${
                        isActive
                          ? "border-navy bg-navy text-white"
                          : "border-border bg-white text-primary hover:border-acc-bd"
                      }`}
                    >
                      {region.name}
                      <span className={`ml-1 font-semibold ${isActive ? "text-[#9DB0CA]" : "text-[#9AA5B4]"}`}>
                        {region.count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <label className="flex items-center gap-1.5 font-ui text-xs font-semibold text-secondary">
                  Sort:
                  <select
                    value={data.sort}
                    onChange={(e) => go({ sort: e.target.value as LibrarySort })}
                    className="rounded border border-border bg-white px-1.5 py-1 font-ui text-xs text-primary outline-none focus:border-accent"
                  >
                    {LIBRARY_SORT_ORDER.map((s) => (
                      <option key={s} value={s}>
                        {LIBRARY_SORT_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-1.5 font-ui text-xs font-semibold text-secondary">
                  <input
                    type="checkbox"
                    checked={data.hideRead}
                    onChange={(e) => go({ hideRead: e.target.checked })}
                    className="size-3.5 accent-accent"
                  />
                  Hide read
                </label>
              </div>
            </div>

            <div className="mt-3.5 overflow-hidden rounded-2xl border border-border">
              <div className="grid grid-cols-[1fr_140px_20px] gap-3.5 bg-surface-sunken px-[18px] py-2 font-ui text-[10px] font-black tracking-[1.3px] text-[#9AA5B4] min-[1100px]:grid-cols-[1fr_150px_140px_20px]">
                <span>PAGE</span>
                <span className="hidden min-[1100px]:block">TYPE</span>
                <span>PROGRESS</span>
                <span />
              </div>

              {data.folders.length === 0 && data.loosePages.length === 0 ? (
                <p className="px-[18px] py-6 font-ui text-sm text-secondary">
                  {data.hideRead
                    ? "Nothing left unread here — nice work."
                    : data.activeType
                      ? `No ${DISEASE_PAGE_TYPE_LABEL[data.activeType].toLowerCase()} pages in this region yet.`
                      : "No pages in this region yet."}
                </p>
              ) : (
                <>
                  {data.folders.map((folder, i) => (
                    <div key={folder.name}>
                      <div
                        className={`flex items-center gap-2 px-[18px] pt-3 pb-1.5 font-ui text-[10.5px] font-black tracking-[1.3px] text-[#8C7440] ${
                          i > 0 ? "border-t border-[#EEF1F5]" : ""
                        }`}
                      >
                        <Folder className="size-3 rounded-[4px] border border-[#E6CF9C] bg-[#FBF2DF] p-0.5 text-[#8C7440]" aria-hidden="true" />
                        {folder.name.toUpperCase()}
                        <span className="font-bold text-[#B4BDC8]">{folder.pages.length}</span>
                      </div>
                      {folder.pages.map((page) => (
                        <div key={page.slug} className="border-t border-[#F2F4F7]">
                          <PageRowView page={page} />
                        </div>
                      ))}
                    </div>
                  ))}
                  {data.loosePages.map((page, i) => (
                    <div
                      key={page.slug}
                      className={i > 0 || data.folders.length > 0 ? "border-t border-[#F2F4F7]" : ""}
                    >
                      <PageRowView page={page} />
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
