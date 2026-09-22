import { Link } from "@/i18n/navigation";
import type { ContinueReadingItem } from "@/lib/library-progress";

// "The page's diagram, then the region's, then a plain tint" — same
// fallback chain the feature panel's own artwork uses (resolveThumbnail
// in library-home.ts). `areaColor` only matters for the plain-tint
// case; a real image never needs it.
function CardThumbnail({ item }: { item: ContinueReadingItem }) {
  if (item.thumbnail.assetUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured (same reasoning as every other illustration render in this codebase).
      <img src={item.thumbnail.assetUrl} alt={item.thumbnail.alt} className="size-full object-cover" />
    );
  }
  return (
    <div
      className="size-full"
      style={{ background: item.areaColor ? `${item.areaColor}1A` : "#EEF1F5" }}
      aria-hidden="true"
    />
  );
}

// Hidden entirely when empty (first visit, or a returning reader with
// nothing currently unfinished) rather than shown with placeholder
// cards — same "hide, don't fake" rule as every other Pass 2 section.
export function ContinueReading({ items }: { items: ContinueReadingItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="px-6 pt-7">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-heading text-[19px] font-black tracking-[-0.4px] text-navy">
          Continue reading
        </h2>
        <span className="font-ui text-[13px] text-secondary">pick up where you left off</span>
      </div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/conditions/${item.slug}`}
            className="flex min-w-0 flex-1 overflow-hidden rounded-[13px] border border-border bg-white transition-colors duration-base hover:border-acc-bd"
          >
            <div className="w-[100px] shrink-0">
              <CardThumbnail item={item} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 p-3.5">
              <span className="font-ui text-[15px] font-black text-navy">{item.title}</span>
              {item.currentSectionLabel && (
                <span className="font-ui text-[11.5px] text-[#9AA5B4]">{item.currentSectionLabel}</span>
              )}
              <span className="mt-2 h-[5px] w-full overflow-hidden rounded-[3px] bg-[#EEF1F5]">
                <span className="block h-[5px] rounded-[3px] bg-acc" style={{ width: `${item.percent}%` }} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
