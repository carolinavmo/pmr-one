import { Check } from "lucide-react";

interface TrustIndicatorProps {
  reviewedAt: Date | string | null | undefined;
}

// One visual form, used identically everywhere an Editorial object
// appears (Tier 2). Renders nothing if the object hasn't been through
// Editorial Review yet — callers don't need their own conditional.
export function TrustIndicator({ reviewedAt }: TrustIndicatorProps) {
  if (!reviewedAt) return null;

  const date = new Date(reviewedAt);
  const label = date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <span className="inline-flex items-center gap-1 font-ui text-xs text-trust">
      <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
      Reviewed · {label}
    </span>
  );
}
