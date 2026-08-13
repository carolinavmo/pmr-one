"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { Search } from "lucide-react";
import type { SearchableItem } from "@/components/ui/SearchExperience";
import { objectIcons } from "@/components/ui/objectIcons";
import { cardIcons } from "@/components/ui/cardIcons";

const RESULT_LIMIT = 8;

// The app's omnipresent search entry point (Tier 3: "Search stays
// omnipresent, not inside any group"). Was a click-to-open modal with
// its own internal input; now a real inline input in the header with
// live results dropping down beneath it as you type — ⌘K focuses the
// field instead of opening an overlay. Fetches /api/search once, on
// first interaction (not on page load, since most visits never search),
// then filters client-side same as SearchExperience did — the catalog
// is small enough that this doesn't need a debounced server round trip
// per keystroke.
export function CommandPalette({ signedOut }: { signedOut: boolean }) {
  const t = useTranslations("nav");
  const tSearch = useTranslations("search");
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchableItem[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function ensureItemsLoaded() {
    if (items !== null) return;
    fetch("/api/search")
      .then((res) => res.json())
      .then((data: { items: SearchableItem[] }) => setItems(data.items));
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      } else if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const results = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) || item.context.toLowerCase().includes(q)
      )
      .slice(0, RESULT_LIMIT);
  }, [items, query]);

  const showDropdown = open && query.trim().length > 0;

  // The guest homepage's own hero already carries a "Explore PM&R
  // Atlas" / "Create account" pair as the primary calls to action —
  // an omnipresent search box competing for attention there isn't
  // doing anything a signed-out visitor needs yet. Every other route,
  // and every signed-in visitor, keeps it. Placed after every hook
  // above so this early return never changes hook order.
  if (signedOut && pathname === "/") {
    return null;
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <span className="flex min-h-10 items-center gap-2 rounded-full border border-accent/30 bg-surface pl-4 transition-colors duration-base focus-within:border-accent">
        <Search className="size-4 shrink-0 text-accent" aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            ensureItemsLoaded();
          }}
          onFocus={() => {
            setOpen(true);
            ensureItemsLoaded();
          }}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchLabel")}
          className="min-w-0 flex-1 bg-transparent font-ui text-sm text-accent placeholder:text-accent/70 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus();
            if (query) setOpen(true);
            ensureItemsLoaded();
          }}
          className="hidden shrink-0 -my-px -mr-px items-center self-stretch rounded-full bg-accent-hover px-5 font-ui text-sm font-medium text-white transition-colors duration-base hover:bg-accent sm:flex"
        >
          {tSearch("searchButton")}
        </button>
      </span>

      {showDropdown && (
        <div className="absolute top-full left-0 z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-lg sm:min-w-72">
          {items === null ? (
            <p className="px-3 py-2 font-ui text-sm text-secondary">{t("paletteLoading")}</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-2 font-ui text-sm text-secondary">
              {t("noMatchesFor", { query })}{" "}
              <Link
                href="/conditions"
                onClick={() => setOpen(false)}
                className="text-accent hover:underline"
              >
                {tSearch("browseAllConditions")}
              </Link>
            </p>
          ) : (
            results.map((item) => {
              const Icon = item.icon ? cardIcons[item.icon] : objectIcons[item.type];
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors duration-base hover:bg-border/40"
                >
                  <Icon className="size-4 shrink-0 text-secondary" aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-ui text-sm text-primary">{item.title}</span>
                    <span className="truncate font-ui text-xs text-secondary">{item.context}</span>
                  </span>
                </Link>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
