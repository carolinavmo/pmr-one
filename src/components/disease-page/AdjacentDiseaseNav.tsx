import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { AdjacentDiseases } from "@/lib/topics";

interface AdjacentDiseaseNavProps {
  adjacent: AdjacentDiseases;
}

// Bottom-of-page Previous/Next, reading like turning pages in a book —
// getAdjacentDiseases already flattened the whole topic tree
// depth-first, so this crosses a topic boundary seamlessly (last
// disease in one leaf topic -> first disease in the next) rather than
// being confined to the current disease's own category. Renders
// nothing for whichever side is missing (the very first/last disease
// in that flattened order) rather than a disabled-looking placeholder.
export async function AdjacentDiseaseNav({ adjacent }: AdjacentDiseaseNavProps) {
  if (!adjacent.previous && !adjacent.next) return null;
  const t = await getTranslations("disease");

  return (
    <div className="mt-4 flex items-stretch gap-3">
      {adjacent.previous ? (
        <Link
          href={`/conditions/${adjacent.previous.slug}`}
          className="flex flex-1 items-center gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 transition-colors duration-base hover:border-accent/40 hover:bg-accent/5"
        >
          <ArrowLeft className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          <span className="flex min-w-0 flex-col">
            <span className="font-ui text-xs text-secondary">{t("previous")}</span>
            <span className="truncate font-ui text-sm font-medium text-primary">
              {adjacent.previous.canonicalName}
            </span>
          </span>
        </Link>
      ) : (
        <div className="flex-1" />
      )}
      {adjacent.next ? (
        <Link
          href={`/conditions/${adjacent.next.slug}`}
          className="flex flex-1 items-center justify-end gap-3 rounded-xl border border-border bg-surface-card px-4 py-3 text-right transition-colors duration-base hover:border-accent/40 hover:bg-accent/5"
        >
          <span className="flex min-w-0 flex-col items-end">
            <span className="font-ui text-xs text-secondary">{t("next")}</span>
            <span className="truncate font-ui text-sm font-medium text-primary">
              {adjacent.next.canonicalName}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
        </Link>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
