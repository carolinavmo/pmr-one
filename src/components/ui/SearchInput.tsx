import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

type SearchInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

// Single-line input uses the UI typeface (Tier 2 Forms) — search is
// chrome, not content.
export function SearchInput(props: SearchInputProps) {
  return (
    <span className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface-raised px-4">
      <Search className="size-4 shrink-0 text-secondary" aria-hidden="true" />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent font-ui text-sm text-primary placeholder:text-secondary focus:outline-none"
        {...props}
      />
    </span>
  );
}
