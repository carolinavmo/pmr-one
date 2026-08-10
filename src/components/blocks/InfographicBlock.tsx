"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { InfographicBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateInfographicTilesAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";

type Tile = { value: string; label: string };

// A small set of stat/fact tiles — the same value+label shape the
// homepage's stats row already uses, just editable and embeddable
// inline in a disease page. Owns-content, no Knowledge Object,
// deliberately not a chart-building tool — reordering tiles doesn't
// carry the same meaning a Timeline's step order does, so no
// up/down controls here, just add/delete.
export function InfographicBlockView({
  block,
  diseaseSlug,
}: {
  block: InfographicBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [tiles, setTiles] = useState<Tile[]>(block.tiles);

  const commit = (next: Tile[]) => {
    setTiles(next);
    updateInfographicTilesAction(block.id, next);
  };

  if (!editing) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile, index) => (
          <div key={index} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-raised p-3 text-center">
            <RichEditableText
              as="span"
              value={tile.value}
              onSave={async (html) => commit(tiles.map((t, i) => (i === index ? { ...t, value: html } : t)))}
              placeholder=""
              className="font-reading text-2xl text-primary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              value={tile.label}
              onSave={async (html) => commit(tiles.map((t, i) => (i === index ? { ...t, label: html } : t)))}
              placeholder=""
              className="font-ui text-xs text-secondary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tiles.map((tile, index) => (
          <div key={index} className="relative flex flex-col items-center gap-1 rounded-lg border border-border bg-surface-raised p-3">
            <button
              type="button"
              aria-label="Delete tile"
              onClick={() => commit(tiles.filter((_, i) => i !== index))}
              className="absolute top-1 right-1 flex size-5 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
            <RichEditableText
              as="span"
              value={tile.value}
              onSave={async (html) => commit(tiles.map((t, i) => (i === index ? { ...t, value: html } : t)))}
              placeholder="Value"
              className="w-full text-center font-reading text-xl text-primary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              value={tile.label}
              onSave={async (html) => commit(tiles.map((t, i) => (i === index ? { ...t, label: html } : t)))}
              placeholder="Label"
              className="w-full text-center font-ui text-xs text-secondary"
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => commit([...tiles, { value: "", label: "" }])}
        className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
      >
        <Plus className="size-3.5" aria-hidden="true" />
        Add tile
      </button>
    </div>
  );
}
