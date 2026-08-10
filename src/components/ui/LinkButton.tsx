import { Link } from "@/i18n/navigation";
import type { AnchorHTMLAttributes, ComponentProps, ReactNode } from "react";
import { buttonBaseClasses, buttonVariantStyles, type ButtonVariant } from "./button-styles";

// ComponentProps<typeof Link> instead of importing LinkProps directly
// from next/link — next-intl's locale-aware Link (below) has its own
// (near-identical) prop type, and deriving from the actual component
// in use means this never silently drifts from whichever Link this
// file imports.
type NavLinkProps = ComponentProps<typeof Link>;

interface LinkButtonProps
  extends NavLinkProps,
    Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof NavLinkProps> {
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
}

// A Link that reads as a Button (Tier 2 button styling) rather than a
// real <button> nested in an <a> — the two are interactive elements
// and HTML doesn't allow nesting them. Same variant styles as Button,
// via button-styles.ts, so the two can never visually drift apart.
export function LinkButton({ variant = "secondary", className = "", children, ...props }: LinkButtonProps) {
  return (
    <Link
      className={`${buttonBaseClasses} ${buttonVariantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}
