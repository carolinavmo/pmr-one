"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";
import { signOutAction } from "@/lib/actions/auth";

interface UserMenuProps {
  name: string | null | undefined;
  email: string | null | undefined;
  image: string | null | undefined;
  canReview: boolean;
  isAdmin: boolean;
}

// Initials from the real name collected at registration (see
// register/page.tsx's "name" field) — falls back to the email's first
// character for the handful of accounts seeded before that field
// existed. Never fabricates a name that isn't there.
function initialsFor(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2);
    return initials.toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}

// Same click-outside/Escape pattern as NavDropdown.tsx, applied to the
// account corner instead of a nav group — folds Account/Admin/Sign out
// behind one avatar trigger rather than three separate top-level links.
export function UserMenu({ name, email, image, canReview, isAdmin }: UserMenuProps) {
  const t = useTranslations("nav");
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
        aria-label={t("accountMenu")}
        className="flex min-h-11 items-center gap-1.5 rounded-full py-1 pl-1 pr-2 transition-colors duration-base hover:bg-border/40"
      >
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-ui text-sm font-semibold text-white ring-2 ring-surface">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-owned upload (public/uploads/avatars), same as SimpleImageBlock/OverviewBlock; no fixed remote-pattern domain to configure.
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            initialsFor(name, email)
          )}
        </span>
        <ChevronDown className="size-4 text-secondary" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 min-w-52 rounded-lg border border-border bg-surface-raised p-1 shadow-lg">
          {email && (
            <div className="truncate px-3 py-2 font-ui text-xs text-secondary">{email}</div>
          )}
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
          >
            {t("account")}
          </Link>
          {canReview && (
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
            >
              {t("admin")}
            </Link>
          )}
          {canReview && (
            <Link
              href="/?preview=hero"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
            >
              {t("previewHomepage")}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/topics"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
            >
              {t("manageTopics")}
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/analytics"
              onClick={() => setOpen(false)}
              className="block rounded-md px-3 py-2 font-ui text-sm text-primary hover:bg-border/40"
            >
              {t("analytics")}
            </Link>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="block w-full rounded-md px-3 py-2 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              {t("signOut")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
