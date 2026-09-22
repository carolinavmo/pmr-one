import { Star } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { TopicOfWeekFeature } from "@/lib/library-home";
import { toggleDiseaseFavoriteAction } from "@/lib/actions/workspace";

const REVIEWED_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

// Hidden entirely when nothing is flagged (or the flagged page has no
// pitch yet) — getTopicOfWeek() already returns null for both cases,
// so this component only ever renders the real thing.
export function TopicOfWeekFeatureView({ feature }: { feature: TopicOfWeekFeature }) {
  const metaParts = [
    feature.regionName,
    `${feature.readingMinutes} min`,
    feature.reviewedAt ? `✓ Reviewed ${REVIEWED_FORMAT.format(feature.reviewedAt)}` : null,
  ].filter(Boolean);

  return (
    <div className="px-6 pt-7">
      <div className="flex flex-col gap-5 overflow-hidden rounded-[18px] bg-navy p-[26px] sm:flex-row sm:items-center sm:p-[30px]">
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[10.5px] font-black tracking-[1.6px] text-acc-dk">
            TOPIC OF THE WEEK
          </p>
          <p className="mt-1.5 font-heading text-2xl font-black tracking-[-0.6px] text-white sm:text-[28px]">
            {feature.title}
          </p>
          <p className="mt-2 max-w-[560px] font-ui text-[14.5px] leading-[1.55] text-[#C8D3E2]">
            {feature.pitch}
          </p>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <Link
              href={`/conditions/${feature.slug}`}
              className="rounded-[10px] bg-acc px-4 py-2.5 font-ui text-[13px] font-extrabold text-white"
            >
              Start reading
            </Link>
            <form action={toggleDiseaseFavoriteAction}>
              <input type="hidden" name="diseaseId" value={feature.diseaseId} />
              <input type="hidden" name="diseaseSlug" value={feature.slug} />
              <button
                type="submit"
                aria-pressed={feature.isFavorited}
                className="flex items-center gap-1.5 rounded-[10px] border border-white/25 px-4 py-2.5 font-ui text-[13px] font-extrabold text-white"
              >
                <Star className="size-3.5" fill={feature.isFavorited ? "currentColor" : "none"} aria-hidden="true" />
                {feature.isFavorited ? "Saved to handbook" : "Save to handbook"}
              </button>
            </form>
          </div>
          {metaParts.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-4 font-ui text-xs font-bold text-[#9DB0CA]">
              {metaParts.map((part, i) => (
                <span key={i}>{part}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex h-[150px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[14px] border border-white/[0.12] bg-white/[0.06] p-3 sm:w-[240px]">
          {feature.thumbnail.assetUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured (same reasoning as every other illustration render in this codebase).
            <img
              src={feature.thumbnail.assetUrl}
              alt={feature.thumbnail.alt}
              className="max-h-full max-w-full object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
