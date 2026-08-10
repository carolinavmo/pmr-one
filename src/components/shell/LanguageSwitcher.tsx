"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Check, ChevronDown, Globe } from "lucide-react";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/locales";

// Same click-outside/Escape panel pattern as UserMenu.tsx, applied to
// locale choice instead of the account menu. `usePathname()` here is
// next-intl's own (not next/navigation's) — it already strips the
// locale prefix, so the current route is preserved by handing it
// straight back to `replace()` with only the locale swapped, never by
// hand-rolling prefix string surgery on the raw URL.
export function LanguageSwitcher() {
  const t = useTranslations("nav");
  // useLocale()'s return type is the generic use-intl `Locale` (an
  // unconstrained string) — this app hasn't registered next-intl's
  // global type augmentation, so narrow it here. Safe: the proxy only
  // ever forwards the four known prefixes (src/proxy.ts), same
  // reasoning the root layout's own isLocale() guard documents.
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
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
        aria-label={t("languageSwitcher")}
        className="flex min-h-11 items-center gap-1 rounded-full px-2 font-ui text-sm font-medium text-primary transition-colors duration-base hover:bg-border/40"
      >
        <Globe className="size-4 text-secondary" aria-hidden="true" />
        {LOCALE_META[locale].shortLabel}
        <ChevronDown className="size-3.5 text-secondary" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-48 rounded-lg border border-border bg-surface-raised p-1 shadow-lg">
          {LOCALES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setOpen(false);
                router.replace(pathname, { locale: option });
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              {LOCALE_META[option].nativeName}
              {option === locale && (
                <Check className="size-4 shrink-0 text-accent" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
