"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { BlockPicker } from "@/components/disease-page/BlockPicker";

interface EmptyBlockPromptProps {
  diseaseId: string;
  canEdit: boolean;
}

// BlockControls' own "+" inserter only ever renders wrapped around an
// existing block, so a brand-new disease (created via /admin/topics'
// "Add condition") — zero blocks, nothing to wrap — has no way to add
// its first one. Same BlockPicker, opened at position 0 instead of
// anchored to a block that doesn't exist yet. Gated on `canEdit`
// (server-computed permission), not an `editing` toggle — since #136
// replaced the single page-wide Edit button with per-section toggles,
// and an empty page has no section to attach one to, there's nothing
// to "enter edit mode" for here: an editor sees this prompt directly,
// a visitor sees nothing, same as before this feature existed.
export function EmptyBlockPrompt({ diseaseId, canEdit }: EmptyBlockPromptProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!canEdit) return null;

  return (
    <div className="relative flex justify-center rounded-xl border border-dashed border-border py-10">
      <button
        type="button"
        onClick={() => setPickerOpen((open) => !open)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-raised px-4 py-2 font-ui text-sm text-secondary transition-colors duration-base hover:border-accent/40 hover:text-accent"
      >
        <Plus className="size-4" aria-hidden="true" />
        Add the first block
      </button>
      {pickerOpen && (
        <div className="absolute top-full z-10 mt-2">
          <BlockPicker diseaseId={diseaseId} afterPosition={0} onClose={() => setPickerOpen(false)} />
        </div>
      )}
    </div>
  );
}
