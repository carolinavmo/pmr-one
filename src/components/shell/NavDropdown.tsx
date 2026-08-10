"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";

interface NavDropdownItem {
  label: string;
  href: string;
}

interface NavDropdownProps {
  label: string;
  items: NavDropdownItem[];
}

// Built as a real dropdown even though only one item exists today —
// Tier 3 (DESIGN_SYSTEM_TIER3_BEHAVIOR.md) groups nav by intent
// ("Learn" reveals Conditions, Visual Atlas), so this shape is ready
// for a second item without a rewrite. The doc's own rule — render
// only what exists, no empty/grayed-out groups — is honored by the
// caller only ever passing real items in, not by this component.
export function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-ui text-sm text-primary transition-colors duration-base hover:bg-border/40"
      >
        {label}
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 min-w-40 rounded-lg border border-border bg-surface-raised p-1 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
