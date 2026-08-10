import type { ReactNode } from "react";

interface ClinicalBadgeProps {
  tone?: "neutral" | "warning";
  children: ReactNode;
}

// Neutral gray by default; only escalates to the flag color for
// genuinely important flags (e.g. a red-flag differential). If every
// badge is colored, none of them mean anything (Tier 2).
export function ClinicalBadge({ tone = "neutral", children }: ClinicalBadgeProps) {
  const toneStyles =
    tone === "warning"
      ? "border-warning/40 text-warning"
      : "border-border text-secondary";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-ui text-sm ${toneStyles}`}
    >
      {children}
    </span>
  );
}
