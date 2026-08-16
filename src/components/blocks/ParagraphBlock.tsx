"use client";

import { useState } from "react";
import { Palette, Plus, X } from "lucide-react";
import type { ParagraphBlock, CardColor } from "@/lib/editorial-blocks";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateBlockRichTextAction,
  setCardStyleAction,
  updateParagraphBadgesAction,
} from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { CARD_COLOR_CARD, CARD_COLOR_BADGE, CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

export function ParagraphBlockView({
  block,
  diseaseSlug,
}: {
  block: ParagraphBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [expanded, setExpanded] = useState(false);
  const [stylePickerOpen, setStylePickerOpen] = useState(false);
  const [badgePickerIndex, setBadgePickerIndex] = useState<number | null>(null);
  const [badges, setBadges] = useState(block.badges ?? []);
  const collapsible = block.expandable && !expanded;
  const cardStyle = block.cardStyle ?? "neutral";

  const commitBadges = (next: { text: string; color: CardColor }[]) => {
    setBadges(next);
    updateParagraphBadgesAction(block.id, next);
  };

  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  const body = (
    <RichEditableText
      as="p"
      className={`font-reading text-base leading-5 text-primary ${TEXT_ALIGN_CLASS[textAlign]} ${
        collapsible ? "line-clamp-3" : ""
      }`}
      value={block.body}
      onSave={(value) => updateBlockRichTextAction(block.id, "body", value)}
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );

  const badgeRow = (badges.length > 0 || editing) && (
    <div className="mb-2 flex flex-wrap items-center gap-1.5">
      {badges.map((badge, index) => (
        <span key={index} className="relative">
          <span
            className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 font-ui text-sm ${
              editing ? "pr-1.5" : "pr-3"
            } ${CARD_COLOR_BADGE[badge.color]}`}
          >
            {editing ? (
              <input
                value={badge.text}
                onChange={(e) =>
                  setBadges((current) =>
                    current.map((b, i) => (i === index ? { ...b, text: e.target.value } : b))
                  )
                }
                onBlur={() => commitBadges(badges)}
                placeholder="Badge text"
                className="w-24 min-w-0 bg-transparent text-white outline-none placeholder:text-white/50"
              />
            ) : (
              badge.text
            )}
            {editing && (
              <>
                <button
                  type="button"
                  aria-label="Badge color"
                  onClick={() => setBadgePickerIndex(index)}
                  className={`size-3.5 shrink-0 rounded-full ring-1 ring-white/50 ${CARD_COLOR_SWATCH[badge.color]}`}
                />
                <button
                  type="button"
                  aria-label="Remove badge"
                  onClick={() => commitBadges(badges.filter((_, i) => i !== index))}
                  className="shrink-0 text-white/70 hover:text-white"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </>
            )}
          </span>
          {badgePickerIndex === index && (
            <ColorSwatchPicker
              onPick={(color) => {
                setBadgePickerIndex(null);
                commitBadges(badges.map((b, i) => (i === index ? { ...b, color } : b)));
              }}
            />
          )}
        </span>
      ))}
      {editing && (
        <button
          type="button"
          onClick={() => commitBadges([...badges, { text: "New badge", color: "neutral" }])}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 font-ui text-xs text-secondary hover:border-accent hover:text-accent"
        >
          <Plus className="size-3" aria-hidden="true" />
          Badge
        </button>
      )}
    </div>
  );

  // Leading visual only applies to callout/card-style paragraphs —
  // plain running text never gets a leading icon.
  const Icon = block.icon && isCardIconName(block.icon) ? cardIcons[block.icon] : null;
  const leadingVisual = block.callout && block.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as KnowledgeObjectCard).
    <img
      src={block.imageUrl}
      alt={block.imageAlt ?? ""}
      className="size-9 shrink-0 rounded-md object-cover"
    />
  ) : block.callout && Icon ? (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  ) : null;

  const content = block.callout ? (
    <div className={`relative rounded-lg border p-3 ${CARD_COLOR_CARD[cardStyle]}`}>
      {editing && (
        <div className="absolute top-2 right-2">
          <button
            type="button"
            aria-label="Card color"
            onClick={() => setStylePickerOpen((open) => !open)}
            className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-primary"
          >
            <Palette className="size-3.5" aria-hidden="true" />
          </button>
          {stylePickerOpen && (
            <ColorSwatchPicker
              onPick={(color) => {
                setStylePickerOpen(false);
                setCardStyleAction(block.id, color);
              }}
            />
          )}
        </div>
      )}
      {block.learningObjective && (
        <ClinicalBadge>Learning objective: {block.learningObjective}</ClinicalBadge>
      )}
      {badgeRow}
      <div
        className={`flex gap-3 ${ROW_ITEMS_CLASS[textVerticalAlign]} ${block.learningObjective ? "mt-3" : ""}`}
      >
        {leadingVisual}
        <div className="min-w-0 flex-1">{body}</div>
      </div>
    </div>
  ) : (
    body
  );

  return (
    <div className="flex flex-col gap-2">
      {content}
      {block.expandable && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="self-start font-ui text-sm text-accent hover:text-accent-hover"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
