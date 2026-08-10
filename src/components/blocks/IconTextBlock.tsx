"use client";

import { useState } from "react";
import { Palette, Rows3, Columns2 } from "lucide-react";
import type { IconTextBlock, CardColor } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateIconTextAction } from "@/lib/actions/authoring";
import { CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

// A single icon + label + description row, standalone — one item's
// worth of Timeline's own step shape (#141), for a single fact that
// deserves an icon without a sequence, a multi-item list, or a
// colored card. Neutral bordered circle by default (matches Timeline's
// own icon treatment); `color`, once set, swaps in the same
// CARD_COLOR_CHIP tint every other icon-bearing block already offers.
//
// `title`/`label`/`description` are all RichEditableText fields — same
// bold/italic/underline/strikethrough/size/color/highlight/link/list
// vocabulary every other prose field in this app already has, plus
// text-align (rendered by RichEditableText's own toolbar once `block`/
// `diseaseSlug` are passed, the same mechanism Highlight Card's `text`
// field already uses). Unlike Highlight Card (plain `label`, rich
// `text`), every text field here is rich — founder's own request
// covered "the titles" too, not just the description line.
//
// `titleLayout` ("above", default, vs. "beside") is a second, later
// addition — "version 2": icon on the left, title/label/description
// all stacked to its right (title topmost, label promoted to a large
// value-style line, same visual register Stat Card's own
// `stat_horizontal` variant already established) instead of title
// reading as a full-width header over the whole block.
export function IconTextBlockView({
  block,
  diseaseSlug,
}: {
  block: IconTextBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [title, setTitle] = useState(block.title ?? "");
  const [icon, setIcon] = useState(block.icon);
  const [label, setLabel] = useState(block.label);
  const [description, setDescription] = useState(block.description ?? "");
  const [color, setColor] = useState(block.color);
  const [titleLayout, setTitleLayout] = useState<"above" | "beside">(block.titleLayout ?? "above");
  const textAlign = block.layout?.textAlign ?? "left";

  // Every text field commits through this one whole-content_config
  // replace (matches Stat Card's own pattern) — a RichEditableText
  // field's own onSave supplies just its one changed value, this fills
  // in the rest from current local state so no other field is
  // clobbered by the replace.
  const commit = (next: {
    title: string;
    icon?: string;
    label: string;
    description: string;
    color?: CardColor;
    titleLayout: "above" | "beside";
  }) => {
    setTitle(next.title);
    setIcon(next.icon);
    setLabel(next.label);
    setDescription(next.description);
    setColor(next.color);
    setTitleLayout(next.titleLayout);
    updateIconTextAction(block.id, {
      title: next.title || undefined,
      icon: next.icon,
      label: next.label,
      description: next.description || undefined,
      color: next.color,
      titleLayout: next.titleLayout,
    });
  };

  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;
  const chipClass = color ? CARD_COLOR_CHIP[color] : "border border-border bg-surface-raised text-accent";
  const titleTextClass = color ? CARD_COLOR_TEXT[color] : "text-accent";

  if (!editing) {
    if (titleLayout === "beside") {
      return (
        <div className="flex items-center gap-3">
          <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${chipClass}`}>
            {Icon && <Icon className="size-6" aria-hidden="true" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            {title && (
              <RichEditableText
                as="span"
                className={`font-ui text-sm font-medium ${titleTextClass}`}
                value={title}
                onSave={async (html) => {
                  commit({ title: html, icon, label, description, color, titleLayout });
                }}
                placeholder=""
                block={block}
                diseaseSlug={diseaseSlug}
              />
            )}
            <RichEditableText
              as="span"
              className="font-reading text-2xl font-semibold text-primary"
              value={label}
              onSave={async (html) => {
                commit({ title, icon, label: html, description, color, titleLayout });
              }}
              placeholder=""
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
              value={description}
              onSave={async (html) => {
                commit({ title, icon, label, description: html, color, titleLayout });
              }}
              placeholder=""
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-2">
        {title && (
          <RichEditableText
            as="h3"
            className="font-reading text-lg font-semibold text-primary"
            value={title}
            onSave={async (html) => {
              commit({ title: html, icon, label, description, color, titleLayout });
            }}
            placeholder=""
            block={block}
            diseaseSlug={diseaseSlug}
          />
        )}
        <div className="flex items-center gap-3">
          <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${chipClass}`}>
            {Icon && <Icon className="size-6" aria-hidden="true" />}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <RichEditableText
              as="span"
              className="font-ui text-sm font-semibold text-primary"
              value={label}
              onSave={async (html) => {
                commit({ title, icon, label: html, description, color, titleLayout });
              }}
              placeholder=""
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              className={`font-ui text-xs text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
              value={description}
              onSave={async (html) => {
                commit({ title, icon, label, description: html, color, titleLayout });
              }}
              placeholder=""
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <div className="absolute top-2 right-2">
        <button
          type="button"
          aria-label="Icon color"
          onClick={() => setColorPickerOpen((open) => !open)}
          className="flex size-7 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-primary"
        >
          <Palette className="size-3.5" aria-hidden="true" />
        </button>
        {colorPickerOpen && (
          <ColorSwatchPicker
            onPick={(next) => {
              setColorPickerOpen(false);
              commit({ title, icon, label, description, color: next, titleLayout });
            }}
          />
        )}
      </div>
      <div className="flex w-fit items-center gap-1 rounded-md border border-border p-0.5">
        <button
          type="button"
          aria-label="Title above"
          aria-pressed={titleLayout === "above"}
          onClick={() => commit({ title, icon, label, description, color, titleLayout: "above" })}
          className={`flex items-center gap-1 rounded px-2 py-1 font-ui text-xs transition-colors duration-base ${
            titleLayout === "above" ? "bg-accent/10 text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          <Rows3 className="size-3.5" aria-hidden="true" />
          Title above
        </button>
        <button
          type="button"
          aria-label="Title beside icon"
          aria-pressed={titleLayout === "beside"}
          onClick={() => commit({ title, icon, label, description, color, titleLayout: "beside" })}
          className={`flex items-center gap-1 rounded px-2 py-1 font-ui text-xs transition-colors duration-base ${
            titleLayout === "beside" ? "bg-accent/10 text-accent" : "text-secondary hover:text-primary"
          }`}
        >
          <Columns2 className="size-3.5" aria-hidden="true" />
          Title beside icon
        </button>
      </div>
      {titleLayout === "beside" ? (
        <div className="flex items-center gap-3">
          <IconPickerButton
            icon={icon}
            chipClass={chipClass}
            onPick={(next) => commit({ title, icon: next, label, description, color, titleLayout })}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <RichEditableText
              as="span"
              className={`font-ui text-sm font-medium ${titleTextClass}`}
              value={title}
              onSave={async (html) => {
                commit({ title: html, icon, label, description, color, titleLayout });
              }}
              placeholder="Title (optional)"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              className="font-reading text-2xl font-semibold text-primary"
              value={label}
              onSave={async (html) => {
                commit({ title, icon, label: html, description, color, titleLayout });
              }}
              placeholder="Label"
              block={block}
              diseaseSlug={diseaseSlug}
            />
            <RichEditableText
              as="span"
              className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
              value={description}
              onSave={async (html) => {
                commit({ title, icon, label, description: html, color, titleLayout });
              }}
              placeholder="Description (optional)"
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="max-w-[calc(100%-2.5rem)]">
            <RichEditableText
              as="h3"
              className="font-reading text-lg font-semibold text-primary"
              value={title}
              onSave={async (html) => {
                commit({ title: html, icon, label, description, color, titleLayout });
              }}
              placeholder="Title (optional)"
              block={block}
              diseaseSlug={diseaseSlug}
            />
          </div>
          <div className="flex items-start gap-3">
            <IconPickerButton
              icon={icon}
              chipClass={chipClass}
              onPick={(next) => commit({ title, icon: next, label, description, color, titleLayout })}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1">
              <RichEditableText
                as="span"
                className="font-ui text-sm font-semibold text-primary"
                value={label}
                onSave={async (html) => {
                  commit({ title, icon, label: html, description, color, titleLayout });
                }}
                placeholder="Label"
                block={block}
                diseaseSlug={diseaseSlug}
              />
              <RichEditableText
                as="span"
                className={`font-ui text-xs text-secondary ${TEXT_ALIGN_CLASS[textAlign]}`}
                value={description}
                onSave={async (html) => {
                  commit({ title, icon, label, description: html, color, titleLayout });
                }}
                placeholder="Description (optional)"
                block={block}
                diseaseSlug={diseaseSlug}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function IconPickerButton({
  icon,
  chipClass,
  onPick,
}: {
  icon?: string;
  chipClass: string;
  onPick: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Pick icon"
        className={`flex size-14 shrink-0 items-center justify-center rounded-full ${chipClass}`}
      >
        {Icon && <Icon className="size-6" aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute top-16 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
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
