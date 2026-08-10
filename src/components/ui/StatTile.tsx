import type { LucideIcon } from "lucide-react";
import { CARD_COLOR_CHIP } from "@/lib/card-colors";
import type { CardColor } from "@/lib/editorial-blocks";

// Shared between /admin and /admin/analytics so the two never drift
// into two different "stat tile" visual languages — color is chosen
// per metric category (CARD_COLOR_CHIP), not decorative-only.
export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail?: string;
  color: CardColor;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 shadow-sm">
      <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}>
        <Icon className="size-4.5" aria-hidden="true" />
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="font-reading text-2xl font-semibold text-primary tabular-nums">
          {value.toLocaleString()}
        </span>
        <span className="font-ui text-xs text-secondary">{label}</span>
        {detail && <span className="truncate font-ui text-[11px] text-secondary/80">{detail}</span>}
      </span>
    </div>
  );
}
