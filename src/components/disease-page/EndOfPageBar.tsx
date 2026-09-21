"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { Star, Share2, Check } from "lucide-react";
import { toggleDiseaseFavoriteAction } from "@/lib/actions/workspace";
import type { TopicDisease } from "@/lib/topics";

interface EndOfPageBarProps {
  pathLabel: string;
  previous: TopicDisease | null;
  next: TopicDisease | null;
  diseaseId: string;
  diseaseSlug: string;
  isSignedIn: boolean;
  isFavorited: boolean;
}

// SIDEBAR-SPEC.md's "end of page" bar — previous/next scoped to the
// disease's own folder (getFolderAdjacentDiseases, topic-scoped),
// distinct from the existing site-wide AdjacentDiseaseNav just above
// it (which flattens the whole tree on purpose for "keep reading
// anything next"). Left that one in place rather than replacing it —
// this bar answers a narrower question ("what else is in this
// folder"), not the same one.
export function EndOfPageBar({
  pathLabel,
  previous,
  next,
  diseaseId,
  diseaseSlug,
  isSignedIn,
  isFavorited,
}: EndOfPageBarProps) {
  const [copied, setCopied] = useState(false);

  // Save reuses the disease header's own favorite mechanism verbatim
  // (toggleDiseaseFavoriteAction, a plain Server Action — no separate
  // "save" concept exists in the schema) — same form/hidden-input
  // shape as DiseaseHeader.tsx's Favourite control.
  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: document.title });
        return;
      } catch {
        // Cancelled or unsupported — fall through to clipboard.
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!previous && !next) return null;

  return (
    <div className="overflow-hidden rounded-[14px] border border-border">
      <div className="border-b border-border bg-surface-sunken px-[18px] py-2.5 font-ui text-[11px] font-black tracking-[1.4px] text-secondary uppercase">
        {pathLabel}
      </div>
      <div className="flex flex-col gap-3.5 p-[18px] sm:flex-row sm:items-stretch">
        {previous ? (
          <Link
            href={`/conditions/${previous.slug}`}
            className="flex-1 rounded-xl border border-border px-4 py-3.5 transition-colors duration-base hover:border-accent"
          >
            <div className="font-ui text-[10px] font-black tracking-[1.3px] text-secondary uppercase">
              Previous in this folder
            </div>
            <div className="mt-[3px] font-ui text-base font-black text-navy">{previous.canonicalName}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center justify-center gap-1.5">
          {isSignedIn && (
            <form action={toggleDiseaseFavoriteAction}>
              <input type="hidden" name="diseaseId" value={diseaseId} />
              <input type="hidden" name="diseaseSlug" value={diseaseSlug} />
              <button
                type="submit"
                aria-pressed={isFavorited}
                className={`flex items-center gap-1.5 rounded-full border px-[13px] py-[7px] font-ui text-[11.5px] font-bold whitespace-nowrap transition-colors duration-base ${
                  isFavorited ? "border-accent text-accent" : "border-border text-secondary hover:text-primary"
                }`}
              >
                <Star className="size-3.5" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
                Save
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full border border-border px-[13px] py-[7px] font-ui text-[11.5px] font-bold whitespace-nowrap text-secondary transition-colors duration-base hover:text-primary"
          >
            {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Share2 className="size-3.5" aria-hidden="true" />}
            {copied ? "Copied" : "Share"}
          </button>
        </div>

        {next ? (
          <Link
            href={`/conditions/${next.slug}`}
            className="flex-1 rounded-xl bg-navy px-4 py-3.5 text-right transition-colors duration-base hover:bg-navy/90"
          >
            <div className="font-ui text-[10px] font-black tracking-[1.3px] text-[#7FCBD1] uppercase">
              Next in this folder
            </div>
            <div className="mt-[3px] font-ui text-base font-black text-white">{next.canonicalName}</div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
