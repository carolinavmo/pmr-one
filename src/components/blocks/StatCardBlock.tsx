"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Plus, Palette } from "lucide-react";
import type { StatCardBlock, StatCardVariant, CardColor } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateStatCardAction } from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { CARD_COLOR_CARD, CARD_COLOR_CHIP, CARD_COLOR_TEXT } from "@/lib/card-colors";
import { RichEditableText } from "@/components/ui/RichEditableText";

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

const VARIANT_LABEL: Record<StatCardVariant, string> = {
  stat: "Stat",
  stat_horizontal: "Stat (horizontal)",
  metric: "Metric",
  progress_linear: "Progress (linear)",
  progress_circular: "Progress (circular)",
};

interface Fields {
  variant: StatCardVariant;
  icon?: string;
  value: string;
  label: string;
  subtext: string;
  progress: number;
  linkUrl: string;
  linkLabel: string;
  color?: CardColor;
}

// A single number-forward card, one of four presentations sharing a
// value+label shape: `stat` (icon, big value, label, optional link),
// `metric` (big value, label, small subtext — no icon), and two
// read-outs of the same 0-100 `progress` field (`progress_linear`, a
// bar; `progress_circular`, a ring). Owns-content, no Knowledge
// Object — decorative emphasis for a number an author already has on
// hand, not a live-computed KPI.
export function StatCardBlockView({
  block,
  diseaseSlug,
}: {
  block: StatCardBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [fields, setFields] = useState<Fields>({
    variant: block.variant,
    icon: block.icon,
    value: block.value,
    label: block.label,
    subtext: block.subtext ?? "",
    progress: block.progress ?? 0,
    linkUrl: block.linkUrl ?? "",
    linkLabel: block.linkLabel ?? "",
    color: block.color,
  });

  const commit = (next: Fields) => {
    setFields(next);
    updateStatCardAction(
      block.id,
      {
        variant: next.variant,
        icon: next.icon,
        value: next.value,
        label: next.label,
        subtext: next.subtext || undefined,
        progress: next.progress,
        linkUrl: next.linkUrl || undefined,
        linkLabel: next.linkLabel || undefined,
        color: next.color,
      }
    );
  };

  if (!editing) {
    return <StatCardPreview fields={fields} block={block} diseaseSlug={diseaseSlug} commit={commit} />;
  }

  const showProgress = fields.variant === "progress_linear" || fields.variant === "progress_circular";

  return (
    <div className="relative flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
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
              commit({ ...fields, color: next });
            }}
          />
        )}
      </div>
      <StatCardPreview fields={fields} block={block} diseaseSlug={diseaseSlug} commit={commit} />
      <div className="flex flex-col gap-2 border-t border-border pt-2">
        <select
          value={fields.variant}
          onChange={(e) => commit({ ...fields, variant: e.target.value as StatCardVariant })}
          className="w-fit rounded border border-border bg-surface px-2 py-1 font-ui text-xs text-primary outline-none focus:border-accent"
        >
          {(Object.keys(VARIANT_LABEL) as StatCardVariant[]).map((v) => (
            <option key={v} value={v}>
              {VARIANT_LABEL[v]}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap items-center gap-2">
          {(fields.variant === "stat" || fields.variant === "stat_horizontal") && (
            <IconPickerButton icon={fields.icon} onPick={(icon) => commit({ ...fields, icon })} />
          )}
          <span className="font-ui text-xs text-secondary">Value/label/subtext: click directly on the card above.</span>
        </div>
        {showProgress && (
          <label className="flex w-fit items-center gap-2 font-ui text-xs text-secondary">
            Progress
            <input
              type="number"
              min={0}
              max={100}
              value={fields.progress}
              onChange={(e) => setFields((f) => ({ ...f, progress: Number(e.target.value) }))}
              onBlur={() => commit(fields)}
              className="w-16 rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
            %
          </label>
        )}
        {fields.variant === "stat" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={fields.linkUrl}
              placeholder="Link URL (optional)"
              onChange={(e) => setFields((f) => ({ ...f, linkUrl: e.target.value }))}
              onBlur={() => commit(fields)}
              className="w-56 rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCardPreview({
  fields,
  block,
  diseaseSlug,
  commit,
}: {
  fields: Fields;
  block: StatCardBlock;
  diseaseSlug: string;
  commit: (next: Fields) => void;
}) {
  const { editing } = useEditMode();
  const Icon = fields.icon && isCardIconName(fields.icon) ? cardIcons[fields.icon] : null;
  // Neutral border+surface by default (unchanged from before #133);
  // an explicit `color` swaps in the same card-tint treatment every
  // other card in this pass uses.
  const cardClass = fields.color ? CARD_COLOR_CARD[fields.color] : "border-border bg-surface-raised";
  const chipClass = fields.color ? CARD_COLOR_CHIP[fields.color] : "bg-accent/10 text-accent";
  // Subtext is optional — only shown in read mode when non-empty, same
  // "renders nothing when empty" rule other optional RichEditableText
  // fields follow, but always shown in edit mode so there's somewhere
  // to click to add one.
  const showSubtext = editing || Boolean(fields.subtext);

  const valueField = (className: string) => (
    <RichEditableText
      as="span"
      value={fields.value}
      onSave={async (html) => commit({ ...fields, value: html })}
      placeholder="Value"
      className={className}
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );
  const labelField = (className: string) => (
    <RichEditableText
      as="span"
      value={fields.label}
      onSave={async (html) => commit({ ...fields, label: html })}
      placeholder="Label"
      className={className}
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );
  const subtextField = (className: string) => (
    <RichEditableText
      as="span"
      value={fields.subtext}
      onSave={async (html) => commit({ ...fields, subtext: html })}
      placeholder="Subtext (optional)"
      className={className}
      block={block}
      diseaseSlug={diseaseSlug}
    />
  );

  if (fields.variant === "metric") {
    return (
      <div className={`flex flex-col gap-1 rounded-lg border p-3 ${cardClass}`}>
        {valueField("font-reading text-2xl font-semibold text-primary")}
        {labelField("font-ui text-sm text-secondary")}
        {showSubtext && subtextField("font-ui text-xs text-secondary")}
      </div>
    );
  }

  if (fields.variant === "progress_linear") {
    return (
      <div className={`flex flex-col gap-2 rounded-lg border p-3 ${cardClass}`}>
        <div className="flex items-center justify-between gap-2">
          {labelField("font-ui text-sm text-secondary")}
          <span className="font-ui text-sm font-medium text-primary">{fields.progress}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${fields.progress}%` }} />
        </div>
        {showSubtext && subtextField("font-ui text-xs text-secondary")}
      </div>
    );
  }

  if (fields.variant === "progress_circular") {
    const radius = 26;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - fields.progress / 100);
    return (
      <div className={`flex flex-col items-center gap-2 rounded-lg border p-3 ${cardClass}`}>
        {labelField("self-start font-ui text-sm text-secondary")}
        <div className="relative flex size-16 items-center justify-center">
          <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
            <circle cx="32" cy="32" r={radius} strokeWidth="6" fill="none" className="stroke-border" />
            <circle
              cx="32"
              cy="32"
              r={radius}
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              className="stroke-accent"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <span className="absolute font-ui text-sm font-semibold text-primary">{fields.progress}%</span>
        </div>
        {showSubtext && subtextField("font-ui text-xs text-secondary")}
      </div>
    );
  }

  if (fields.variant === "stat_horizontal") {
    const labelClass = fields.color ? CARD_COLOR_TEXT[fields.color] : "text-accent";
    return (
      <div className={`flex items-center gap-4 rounded-lg border p-3 ${cardClass}`}>
        {Icon && (
          <span className={`flex size-14 shrink-0 items-center justify-center rounded-full ${chipClass}`}>
            <Icon className="size-6" aria-hidden="true" />
          </span>
        )}
        <div className="flex flex-col gap-0.5">
          {labelField(`font-ui text-sm font-medium ${labelClass}`)}
          {valueField("font-reading text-2xl font-semibold text-primary")}
          {showSubtext && subtextField("font-ui text-sm text-secondary")}
        </div>
      </div>
    );
  }

  // stat
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-3 ${cardClass}`}>
      {Icon && (
        <span className={`flex size-10 items-center justify-center rounded-full ${chipClass}`}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
      )}
      <div className="flex flex-col gap-0.5">
        {valueField("font-reading text-2xl font-semibold text-primary")}
        {labelField("font-ui text-sm text-secondary")}
      </div>
      {fields.linkUrl && (
        <Link
          href={fields.linkUrl}
          className="flex items-center gap-1 font-ui text-sm text-accent hover:text-accent-hover"
        >
          <RichEditableText
            as="span"
            value={fields.linkLabel}
            onSave={async (html) => commit({ ...fields, linkLabel: html })}
            placeholder="View all"
            className="font-ui text-sm text-accent"
            block={block}
            diseaseSlug={diseaseSlug}
          />
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function IconPickerButton({ icon, onPick }: { icon?: string; onPick: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Pick icon"
        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-secondary hover:text-primary"
      >
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : <Plus className="size-3" aria-hidden="true" />}
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
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
