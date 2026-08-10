import { forwardRef, type ButtonHTMLAttributes } from "react";
import { buttonBaseClasses, buttonVariantStyles, type ButtonVariant } from "./button-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Tier 2: one accent-filled (primary) button per screen, maximum —
// everything else is secondary or ghost. Enforcing that budget is an
// authoring discipline, not something this component can check.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", className = "", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`${buttonBaseClasses} ${buttonVariantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
