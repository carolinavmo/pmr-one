"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { SearchInput } from "./SearchInput";
import { KnowledgeObjectCard } from "./KnowledgeObjectCard";
import type { KnowledgeObjectType } from "@/lib/knowledge-objects";
import type { CardIconName } from "./cardIcons";

// Illustrations aren't independently searchable at v1 — Visual Atlas
// (the lens that would surface them standalone) is explicitly out of
// MVP scope (spec §6). They still appear inline within Disease Page
// blocks, just not as a search result type.
export interface SearchableItem {
  id: string;
  type: Exclude<KnowledgeObjectType, "medical_illustration">;
  title: string;
  context: string;
  href: string;
  reviewedAt?: Date | string | null;
  icon?: CardIconName;
}

interface SearchExperienceProps {
  items: SearchableItem[];
  placeholder?: string;
}

// Results are a single relevance-ranked list, NOT grouped by object
// type — an Exam Maneuver must be as findable as the Disease it
// belongs to (Tier 2 Search Experience).
export function SearchExperience({
  items,
  placeholder,
}: SearchExperienceProps) {
  const t = useTranslations("nav");
  const tSearch = useTranslations("search");
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.context.toLowerCase().includes(q)
    );
  }, [items, query]);

  return (
    <div className="flex flex-col gap-4">
      <SearchInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder ?? t("searchPlaceholder")}
        aria-label={t("searchLabel")}
      />
      {results.length === 0 ? (
        <p className="font-ui text-sm text-secondary">
          {query ? (
            <>
              {t("noMatchesFor", { query })}{" "}
              <Link href="/conditions" className="text-accent hover:underline">
                {tSearch("browseAllConditionsInstead")}
              </Link>
            </>
          ) : (
            <>
              {tSearch("nothingToSearchYet")}{" "}
              <Link href="/conditions" className="text-accent hover:underline">
                {tSearch("browseAllConditions")}
              </Link>
            </>
          )}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {results.map((item) => (
            <KnowledgeObjectCard key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}
