"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { BadgeRowBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateBadgeRowAction } from "@/lib/actions/authoring";
import { CARD_COLOR_CARD } from "@/lib/card-colors";
import { TEXT_COLOR_CLASS } from "@/lib/rich-text";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

// A standalone row of light/outline pill badges — distinct from
// ParagraphBlock's own `badges` field, which is a solid dark-fill
// pill tied to that block's callout card. This one is a block in its
// own right, insertable anywhere, styled as a quiet tint+border pill
// (reusing CARD_COLOR_CARD/TEXT_COLOR_CLASS, the same tokens a card's
// own background and the rich-text color picker already use) rather
// than the reserved solid-fill treatment.
export function BadgeRowBlockView({
  block,
}: {
  block: BadgeRowBlock;
}) {
  const { editing } = useEditMode();
  const [badges, setBadges] = useState(block.badges);
  const [pickerIndex, setPickerIndex] = useState<{ index: number; kind: "color" | "icon" } | null>(null);

  const commit = (next: typeof badges) => {
    setBadges(next);
    updateBadgeRowAction(block.id, next);
  };

  if (badges.length === 0 && !editing) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {badges.map((badge, index) => {
        const Icon = badge.icon && isCardIconName(badge.icon) ? cardIcons[badge.icon] : null;
        return (
          <div
            key={index}
            className={`relative flex items-center gap-1.5 rounded-full border px-3 py-1 ${CARD_COLOR_CARD[badge.color]}`}
          >
            {editing && (
              <button
                type="button"
                aria-label="Badge icon"
                onClick={() => setPickerIndex({ index, kind: "icon" })}
                className={`flex size-4 shrink-0 items-center justify-center ${TEXT_COLOR_CLASS[badge.color]}`}
              >
                {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : <Plus className="size-3" aria-hidden="true" />}
              </button>
            )}
            {!editing && Icon && (
              <Icon className={`size-3.5 shrink-0 ${TEXT_COLOR_CLASS[badge.color]}`} aria-hidden="true" />
            )}
            {editing ? (
              <input
                value={badge.text}
                onChange={(e) =>
                  setBadges((current) => current.map((b, i) => (i === index ? { ...b, text: e.target.value } : b)))
                }
                onBlur={() => commit(badges)}
                className={`min-w-0 rounded border border-transparent bg-transparent font-ui text-sm font-medium outline-none hover:border-border focus:border-accent ${TEXT_COLOR_CLASS[badge.color]}`}
                style={{ width: `${Math.max(badge.text.length, 4)}ch` }}
              />
            ) : (
              <span className={`font-ui text-sm font-medium ${TEXT_COLOR_CLASS[badge.color]}`}>{badge.text}</span>
            )}
            {editing && (
              <>
                <button
                  type="button"
                  aria-label="Badge color"
                  onClick={() => setPickerIndex({ index, kind: "color" })}
                  className="size-3 shrink-0 rounded-full ring-1 ring-border"
                >
                  <span className={`block size-full rounded-full ${TEXT_COLOR_CLASS[badge.color]} opacity-60`} />
                </button>
                <button
                  type="button"
                  aria-label="Remove badge"
                  onClick={() => commit(badges.filter((_, i) => i !== index))}
                  className="text-secondary hover:text-warning"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </>
            )}
            {pickerIndex?.index === index && pickerIndex.kind === "color" && (
              <ColorSwatchPicker
                onPick={(color) => {
                  setPickerIndex(null);
                  commit(badges.map((b, i) => (i === index ? { ...b, color } : b)));
                }}
              />
            )}
            {pickerIndex?.index === index && pickerIndex.kind === "icon" && (
              <div className="absolute top-6 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
                  const OptionIcon = cardIcons[name];
                  return (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      onClick={() => {
                        setPickerIndex(null);
                        commit(badges.map((b, i) => (i === index ? { ...b, icon: name } : b)));
                      }}
                      className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
                    >
                      <OptionIcon className="size-3.5" aria-hidden="true" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {editing && (
        <button
          type="button"
          onClick={() => commit([...badges, { text: "New badge", color: "neutral" }])}
          className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 font-ui text-sm text-secondary hover:border-accent hover:text-accent"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Badge
        </button>
      )}
    </div>
  );
}
