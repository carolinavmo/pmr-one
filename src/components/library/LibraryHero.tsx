"use client";

import { Search } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { LibraryTypeChipCount } from "@/lib/library-home";
import { DISEASE_PAGE_TYPE_LABEL } from "@/lib/disease-page-type";

export function LibraryHero({
  greeting,
  typeChips,
}: {
  // Computed server-side (see greetForHour in library-home.ts) and
  // passed down as plain text — keeps this "use client" component's
  // first render identical between server and client instead of
  // re-deriving the hour (and risking a server/client clock mismatch)
  // in the browser.
  greeting: string;
  typeChips: LibraryTypeChipCount[];
}) {
  return (
    <div className="border-b border-[#EEF1F5] bg-gradient-to-b from-[#F2F8F9] to-white px-6 pt-16 pb-14 text-center">
      <p className="font-ui text-[22px] font-semibold tracking-[-0.2px] text-secondary">
        {greeting}
      </p>
      <h1 className="mt-2.5 font-heading text-[42px] font-black tracking-[-1.5px] text-navy">
        What do you want to learn today?
      </h1>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("pmr:open-search"))}
        className="mx-auto mt-[26px] flex h-[58px] max-w-[760px] items-center gap-2.5 rounded-2xl border-[1.5px] border-border bg-white pr-2 pl-5 text-left shadow-[0_8px_24px_rgba(20,40,74,0.07)] transition-colors duration-base hover:border-acc-bd"
      >
        <Search className="size-4 shrink-0 text-[#A6B0BC]" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate font-ui text-[15.5px] text-[#A6B0BC]">
          Try &ldquo;rotator cuff&rdquo;, &ldquo;Spurling test&rdquo;, &ldquo;ASIA scale&rdquo;…
        </span>
        <span className="hidden shrink-0 rounded-md border border-border bg-surface-sunken px-[7px] py-[3px] font-mono text-[11px] text-[#8C97A6] sm:inline-block">
          ⌘K
        </span>
        <span className="shrink-0 rounded-[11px] bg-navy px-5 py-[11px] font-ui text-[13.5px] font-extrabold text-white">
          Search
        </span>
      </button>

      {typeChips.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-[7px]">
          <span className="px-0.5 py-1.5 font-ui text-xs font-bold text-[#9AA5B4]">Browse:</span>
          {typeChips.map((chip) => (
            <Link
              key={chip.type}
              href={`/library?type=${chip.type}#browse-by-area`}
              className="rounded-[15px] border border-border bg-white px-3 py-1.5 font-ui text-[12.5px] font-bold text-primary transition-colors duration-base hover:border-acc-bd"
            >
              {DISEASE_PAGE_TYPE_LABEL[chip.type]}
              <span className="ml-1 font-semibold text-[#9AA5B4]">{chip.count}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
