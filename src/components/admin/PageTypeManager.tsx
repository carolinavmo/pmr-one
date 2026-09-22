"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { updateDiseasePageTypeAction } from "@/lib/actions/authoring";
import {
  DISEASE_PAGE_TYPE_ORDER,
  DISEASE_PAGE_TYPE_LABEL,
  isDiseasePageType,
  type DiseasePageType,
} from "@/lib/disease-page-type";

interface PageTypeRow {
  id: string;
  canonicalName: string;
  slug: string;
  status: string;
  type: DiseasePageType | null;
}

// A flat, one-sitting list — deliberately not paginated or searchable
// (founder request: "small enough to do by hand"). Each select saves
// on change; local state updates immediately so the "N of M set"
// count above the list tracks progress without a reload.
export function PageTypeManager({ pages }: { pages: PageTypeRow[] }) {
  const [types, setTypes] = useState<Record<string, DiseasePageType | null>>(
    Object.fromEntries(pages.map((p) => [p.id, p.type]))
  );

  const setCount = Object.values(types).filter(Boolean).length;

  const handleChange = (id: string, value: string) => {
    const next = isDiseasePageType(value) ? value : null;
    setTypes((current) => ({ ...current, [id]: next }));
    updateDiseasePageTypeAction(id, next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="font-ui text-sm text-secondary">
        <span className="font-medium text-primary">{setCount}</span> of {pages.length} set
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-raised text-left">
              <th className="px-3 py-2 font-medium text-secondary">Page</th>
              <th className="px-3 py-2 font-medium text-secondary">Status</th>
              <th className="px-3 py-2 font-medium text-secondary">Type</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2">
                  <Link
                    href={`/conditions/${page.slug}`}
                    className="font-medium text-primary hover:text-accent"
                  >
                    {page.canonicalName}
                  </Link>
                </td>
                <td className="px-3 py-2 text-secondary">{page.status}</td>
                <td className="px-3 py-2">
                  <select
                    value={types[page.id] ?? ""}
                    onChange={(e) => handleChange(page.id, e.target.value)}
                    className="rounded border border-border bg-surface px-1.5 py-1 font-ui text-xs text-secondary outline-none focus:border-accent"
                  >
                    <option value="">— unset</option>
                    {DISEASE_PAGE_TYPE_ORDER.map((t) => (
                      <option key={t} value={t}>
                        {DISEASE_PAGE_TYPE_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
