"use client";

import { useState } from "react";
import { FileText, ExternalLink, Palette } from "lucide-react";
import type { CitationCardBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateCitationCardKickerAction, setBlockCardColorAction } from "@/lib/actions/authoring";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { CARD_COLOR_CARD } from "@/lib/card-colors";
import { RichEditableText } from "@/components/ui/RichEditableText";

// A single prominent citation — singular embed like Risk Factor/
// Clinical Pearl, reusing the same shared `reference` table Reference
// List already draws from. Only `kicker` is editable here; the
// reference's own fields (title/authors/journal/year/url) are shared,
// reused data, same as how Reference List never offers inline editing
// of a reference's own fields either — editing those would be editing
// the shared object, out of scope for this pass.
export function CitationCardBlockView({
  block,
  diseaseSlug,
}: {
  block: CitationCardBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [kicker, setKicker] = useState(block.kicker);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const { reference } = block;
  const cardClass = block.color ? CARD_COLOR_CARD[block.color] : "border-border bg-surface-raised";

  const citation = [reference.authors, reference.year].filter(Boolean).join(" ");

  return (
    <div className={`relative flex flex-col gap-2 rounded-lg border p-3 ${cardClass}`}>
      {editing && (
        <div className="absolute top-2 right-2">
          <button
            type="button"
            aria-label="Card color"
            onClick={() => setColorPickerOpen((open) => !open)}
            className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-primary"
          >
            <Palette className="size-3.5" aria-hidden="true" />
          </button>
          {colorPickerOpen && (
            <ColorSwatchPicker
              onPick={(next) => {
                setColorPickerOpen(false);
                setBlockCardColorAction(block.id, next);
              }}
            />
          )}
        </div>
      )}
      <div className={`flex items-center justify-between gap-2 ${editing ? "pr-8" : ""}`}>
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-accent" aria-hidden="true" />
          <RichEditableText
            as="span"
            value={kicker}
            onSave={async (html) => {
              setKicker(html);
              await updateCitationCardKickerAction(block.id, html);
            }}
            className="font-ui text-sm font-semibold text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
        </div>
        {reference.url && (
          <a
            href={reference.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open reference"
            className="text-secondary hover:text-accent"
          >
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        )}
      </div>
      {citation && <p className="font-ui text-sm font-medium text-primary">{citation}</p>}
      <p className="font-reading text-sm text-secondary">{reference.title}</p>
      {reference.journal && (
        <p className="font-ui text-xs text-secondary">
          {reference.journal}
          {reference.year ? `, ${reference.year}` : ""}
        </p>
      )}
    </div>
  );
}
