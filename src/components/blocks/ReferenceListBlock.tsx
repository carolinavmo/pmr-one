import type { ReferenceListBlock } from "@/lib/editorial-blocks";
import { KnowledgeObjectCard } from "@/components/ui/KnowledgeObjectCard";

// Reuses the Reference variant of the Universal Knowledge Object Card
// as-is (Tier 2) — a reference list is just that card, repeated.
export function ReferenceListBlockView({ block }: { block: ReferenceListBlock }) {
  return (
    <div className="flex flex-col gap-3">
      {block.references.map((reference) => {
        const context = [reference.journal, reference.year?.toString()]
          .filter(Boolean)
          .join(" · ");

        return (
          <KnowledgeObjectCard
            key={reference.id}
            type="reference"
            title={reference.authors ? `${reference.authors} — ${reference.title}` : reference.title}
            context={context || "Citation details unavailable"}
            href={reference.url ?? "#"}
          />
        );
      })}
    </div>
  );
}
