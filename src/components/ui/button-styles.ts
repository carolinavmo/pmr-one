export type ButtonVariant = "primary" | "secondary" | "ghost";

// Shared between Button (a real <button>) and LinkButton (an <a> styled
// identically) — kept in one place so the two never drift apart.
// Tier 2: one accent-filled (primary) surface per screen, maximum.
export const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "border border-border text-primary bg-surface-raised hover:bg-border/40",
  ghost: "text-primary hover:bg-border/40",
};

export const buttonBaseClasses =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 font-ui text-sm font-medium transition-colors duration-base";
