import { Link } from "@/i18n/navigation";
import type { YourProgressData } from "@/lib/library-progress";

const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent, pagesRead, totalPages }: { percent: number; pagesRead: number; totalPages: number }) {
  const dash = (percent / 100) * RING_CIRCUMFERENCE;
  return (
    <svg width="118" height="118" viewBox="0 0 118 118" aria-hidden="true">
      <circle cx="59" cy="59" r={RING_RADIUS} fill="none" stroke="#EEF1F5" strokeWidth="11" />
      <circle
        cx="59"
        cy="59"
        r={RING_RADIUS}
        fill="none"
        stroke="var(--color-acc)"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${RING_CIRCUMFERENCE + 100}`}
        transform="rotate(-90 59 59)"
      />
      <text x="59" y="57" textAnchor="middle" fontFamily="Roboto,Arial" fontSize="26" fontWeight="900" fill="var(--color-navy)">
        {pagesRead}
      </text>
      <text x="59" y="76" textAnchor="middle" fontFamily="Roboto,Arial" fontSize="11" fontWeight="700" fill="#9AA5B4">
        of {totalPages} pages
      </text>
    </svg>
  );
}

const QBANK_TONE_CLASS = {
  strong: "bg-[#E8F5EE] text-[#1F7A4D]",
  review: "bg-[#FBF2DF] text-[#8A5F08]",
  none: "bg-[#EEF1F5] text-[#9AA5B4]",
};

export function YourProgress({ data }: { data: YourProgressData }) {
  if (!data.hasHistory) {
    return (
      <div className="px-6 pt-8">
        <p className="font-ui text-sm text-secondary">
          Your progress will appear here once you start reading.
        </p>
      </div>
    );
  }

  const { overall, byArea, recentlyCompleted, nextSuggestions } = data;

  return (
    <div className="px-6 pt-8">
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="font-heading text-[19px] font-black tracking-[-0.4px] text-navy">Your progress</h2>
        <span className="font-ui text-[13px] text-secondary">
          what you have read — and how you did when tested
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3.5 min-[800px]:grid-cols-[1.05fr_1.35fr_1fr]">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4">
          <ProgressRing percent={overall.percentOfLibrary} pagesRead={overall.pagesRead} totalPages={overall.totalPages} />
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-base font-black text-navy">{overall.percentOfLibrary}% of the library</span>
            {overall.pagesThisWeek > 0 && (
              <span className="font-ui text-[12.5px] font-bold text-[#1F7A4D]">
                ▲ {overall.pagesThisWeek} {overall.pagesThisWeek === 1 ? "page" : "pages"} this week
              </span>
            )}
            <span className="font-ui text-[12.5px] text-secondary">
              {overall.foldersCompleted} {overall.foldersCompleted === 1 ? "folder" : "folders"} completed
            </span>
            <span className="font-ui text-[12.5px] text-secondary">{overall.questionsAnswered} questions answered</span>
          </div>
        </div>

        {byArea.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-1.5 grid grid-cols-[120px_1fr_64px] gap-2.5 font-ui text-[9.5px] font-black tracking-[1.2px] text-[#9AA5B4]">
              <span>BY AREA</span>
              <span>READ</span>
              <span className="text-center">Q-BANK</span>
            </div>
            {byArea.map((row) => (
              <div key={row.area} className="grid grid-cols-[120px_1fr_64px] items-center gap-2.5 py-1.5">
                <span className="flex items-center gap-1.5 font-ui text-[13px] font-bold text-navy">
                  <span className="size-[9px] shrink-0 rounded-[3px]" style={{ background: row.color }} aria-hidden="true" />
                  {row.area}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEF1F5]">
                    <span
                      className="block h-2 rounded-full"
                      style={{ width: `${row.total > 0 ? Math.round((row.read / row.total) * 100) : 0}%`, background: row.color }}
                    />
                  </span>
                  <span className="shrink-0 font-ui text-xs font-semibold text-secondary">
                    {row.read} / {row.total}
                  </span>
                </span>
                <span
                  className={`justify-self-center rounded-[6px] px-0 py-[3px] text-center font-ui text-[11px] font-black ${QBANK_TONE_CLASS[row.qbankTone]}`}
                  style={{ minWidth: 44 }}
                >
                  {row.qbankLabel}
                </span>
              </div>
            ))}
          </div>
        )}

        {recentlyCompleted.length > 0 && (
          <div className="rounded-2xl border border-border bg-white p-3.5">
            <div className="mb-2.5 font-ui text-[9.5px] font-black tracking-[1.2px] text-[#9AA5B4]">
              RECENTLY COMPLETED
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentlyCompleted.map((item) => (
                <Link
                  key={item.slug}
                  href={`/conditions/${item.slug}`}
                  className="rounded-lg bg-[#E8F5EE] px-2.5 py-1.5 font-ui text-[12.5px] font-bold text-[#1F7A4D]"
                >
                  ✓ {item.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {nextSuggestions.length > 0 && (
        <div className="mt-3.5 rounded-2xl border border-border p-3.5">
          <div className="mb-2.5 font-ui text-[9.5px] font-black tracking-[1.2px] text-[#9AA5B4]">
            WHERE TO GO NEXT
          </div>
          {nextSuggestions.map((suggestion, i) => (
            <div
              key={suggestion.href}
              className={`flex items-center gap-2.5 py-2 ${i > 0 ? "border-t border-[#F0F2F5]" : ""}`}
            >
              <div className="min-w-0 flex-1">
                <p className="font-ui text-[13.5px] font-bold text-navy">{suggestion.reason}</p>
                <p className="mt-0.5 font-ui text-xs text-secondary">{suggestion.detail}</p>
              </div>
              <Link
                href={suggestion.href}
                className="shrink-0 rounded-lg bg-navy px-3.5 py-1.5 font-ui text-xs font-bold text-white"
              >
                {suggestion.buttonLabel}
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
