"use client";

import { useState } from "react";
import { Plus, X, Droplet } from "lucide-react";
import type { IconListBlock, CardColor } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateIconListAction } from "@/lib/actions/authoring";
import { CARD_COLOR_ORDER, CARD_COLOR_LABEL, CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { TEXT_COLOR_CLASS } from "@/lib/rich-text";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

// A light circle tint (not TEXT_BG_CLASS's more visible /25 — that's
// tuned for a highlighted run of text, not a small icon badge sitting
// next to plain text all the time) for the icon slot's background.
const ICON_BG_CLASS: Record<CardColor, string> = {
  neutral: "bg-border/60",
  accent: "bg-accent/10",
  trust: "bg-trust/10",
  insight: "bg-insight/10",
  blue: "bg-card-blue/10",
  violet: "bg-card-violet/10",
  rose: "bg-card-rose/10",
  slate: "bg-card-slate/10",
  red: "bg-card-red/10",
  orange: "bg-card-orange/10",
  yellow: "bg-card-yellow/10",
  lime: "bg-card-lime/10",
  green: "bg-card-green/10",
  teal: "bg-card-teal/10",
  cyan: "bg-card-cyan/10",
  sky: "bg-card-sky/10",
  indigo: "bg-card-indigo/10",
  purple: "bg-card-purple/10",
  fuchsia: "bg-card-fuchsia/10",
  pink: "bg-card-pink/10",
};

// A titled, single-color vertical list — each item shows either a
// small icon badge or, when no icon is set, a plain bullet, both
// occupying the same fixed-width slot so every item's text starts at
// the same x position regardless of which it has. One color for the
// whole list (not per item, unlike Badge Row) — it reads as one
// coherent group, e.g. every "Aggravating Factor" the same rose tone.
// Two of these side by side via the existing row-layout mechanism
// reproduce an "Aggravating Factors / Relieving Factors" comparison.
export function IconListBlockView({
  block,
  diseaseSlug,
}: {
  block: IconListBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [title, setTitle] = useState(block.title ?? "");
  const [color, setColor] = useState(block.color);
  const [items, setItems] = useState(block.items);
  const [transparentIcons, setTransparentIcons] = useState(block.transparentIcons ?? false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const commit = (
    nextTitle: string,
    nextColor: CardColor,
    nextItems: typeof items,
    nextTransparentIcons: boolean
  ) => {
    setTitle(nextTitle);
    setColor(nextColor);
    setItems(nextItems);
    setTransparentIcons(nextTransparentIcons);
    updateIconListAction(block.id, nextTitle, nextColor, nextItems, nextTransparentIcons);
  };

  if (items.length === 0 && !editing) return null;

  const iconBgClass = transparentIcons ? "bg-transparent" : ICON_BG_CLASS[color];
  const textAlign = block.layout?.textAlign ?? "left";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {editing ? (
          <input
            value={title}
            placeholder="Title (optional)"
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => commit(title, color, items, transparentIcons)}
            className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 font-reading text-lg font-semibold text-primary outline-none hover:border-border focus:border-accent"
          />
        ) : (
          title && <h3 className="font-reading text-lg font-semibold text-primary">{title}</h3>
        )}
        {editing && (
          <>
            <button
              type="button"
              aria-label="Toggle transparent icon background"
              aria-pressed={transparentIcons}
              title="Transparent icon background"
              onClick={() => commit(title, color, items, !transparentIcons)}
              className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-base ${
                transparentIcons ? "text-accent" : "text-secondary hover:text-primary"
              }`}
            >
              <Droplet className="size-3.5" aria-hidden="true" />
            </button>
            <div className="relative shrink-0">
              <button
                type="button"
                aria-label="List color"
                onClick={() => setColorPickerOpen((o) => !o)}
                className={`size-5 rounded-full ring-1 ring-border ${CARD_COLOR_SWATCH[color]}`}
              />
              {colorPickerOpen && (
                <div className="absolute top-6 right-0 z-10 grid w-44 grid-cols-4 gap-1.5 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                  {CARD_COLOR_ORDER.map((c) => (
                    <button
                      key={c}
                      type="button"
                      title={CARD_COLOR_LABEL[c]}
                      onClick={() => {
                        setColorPickerOpen(false);
                        commit(title, c, items, transparentIcons);
                      }}
                      className={`size-7 rounded-full ${CARD_COLOR_SWATCH[c]}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <ul className="flex flex-col gap-3">
        {items.map((item, index) => {
          const Icon = item.icon && isCardIconName(item.icon) ? cardIcons[item.icon] : null;
          return (
            <li key={index} className="flex items-center gap-3">
              {editing ? (
                <IconPickerButton
                  icon={item.icon}
                  color={color}
                  transparent={transparentIcons}
                  onPick={(icon) =>
                    commit(
                      title,
                      color,
                      items.map((it, i) => (i === index ? { ...it, icon } : it)),
                      transparentIcons
                    )
                  }
                />
              ) : (
                <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconBgClass}`}>
                  {Icon ? (
                    <Icon className={`size-4 ${TEXT_COLOR_CLASS[color]}`} aria-hidden="true" />
                  ) : (
                    <span className={`size-1.5 rounded-full ${TEXT_COLOR_CLASS[color]} bg-current`} />
                  )}
                </span>
              )}
              <RichEditableText
                as="span"
                className={`min-w-0 flex-1 font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
                value={item.text}
                onSave={async (html) => {
                  commit(
                    title,
                    color,
                    items.map((it, i) => (i === index ? { ...it, text: html } : it)),
                    transparentIcons
                  );
                }}
                placeholder="Item text"
                block={block}
                diseaseSlug={diseaseSlug}
              />
              {editing && (
                <button
                  type="button"
                  aria-label="Remove item"
                  onClick={() => commit(title, color, items.filter((_, i) => i !== index), transparentIcons)}
                  className="shrink-0 text-secondary hover:text-warning"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {editing && (
        <button
          type="button"
          onClick={() => commit(title, color, [...items, { text: "" }], transparentIcons)}
          className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Item
        </button>
      )}
    </div>
  );
}

function IconPickerButton({
  icon,
  color,
  transparent,
  onPick,
}: {
  icon?: string;
  color: CardColor;
  transparent?: boolean;
  onPick: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Pick icon"
        className={`flex size-8 shrink-0 items-center justify-center rounded-full ${transparent ? "bg-transparent" : ICON_BG_CLASS[color]}`}
      >
        {Icon ? (
          <Icon className={`size-4 ${TEXT_COLOR_CLASS[color]}`} aria-hidden="true" />
        ) : (
          <span className={`size-1.5 rounded-full ${TEXT_COLOR_CLASS[color]} bg-current`} />
        )}
      </button>
      {open && (
        <div className="absolute top-9 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
          <button
            type="button"
            title="Bullet (no icon)"
            onClick={() => {
              setOpen(false);
              onPick(undefined);
            }}
            className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
          >
            <span className="size-1.5 rounded-full bg-current" />
          </button>
          {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
            const OptionIcon = cardIcons[name];
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  setOpen(false);
                  onPick(name);
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
}
