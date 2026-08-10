"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalJustifyStart,
  AlignHorizontalJustifyEnd,
} from "lucide-react";
import type { EditorialBlock, HorizontalAlign, VerticalAlign } from "@/lib/editorial-blocks";
import { updateBlockAlignmentAction } from "@/lib/actions/authoring";

// section_heading is a bare single-line <h2> with no icon/container to
// hang a vertical-align class on — offering the control there would be
// a dead control (nothing visibly changes), so it's left out rather
// than shown and silently doing nothing.
const SUPPORTS_TEXT_VERTICAL_ALIGN = new Set<EditorialBlock["type"]>([
  "paragraph",
  "key_point",
  "learning_objective",
  "warning_pitfall",
  "clinical_pearl",
  "self_check",
  "overview",
]);

const WIDTH_OPTIONS: { value: NonNullable<import("@/lib/editorial-blocks").BlockLayout["width"]>; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
  { value: "full", label: "100%" },
];

interface AlignmentPickerProps {
  block: EditorialBlock;
}

// Popover for the four/five alignment controls (AUTHORING request:
// "modify vertical and horizontal alignment of the text, and the
// block itself") — scoped to the text/prose block types only
// (ALIGNABLE_TYPES in BlockControls.tsx), since most other block types
// (tables, algorithms, timelines...) don't have a single piece of
// running text to align. Each button fires immediately (matches this
// app's "discrete choice = commit now" convention already used by
// color swatch pickers, not a form with a save button).
export function AlignmentPicker({ block }: AlignmentPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const layout = block.layout;
  const inRow = Boolean(layout?.row);
  const textAlign: HorizontalAlign = layout?.textAlign ?? "left";
  const textVerticalAlign: VerticalAlign = layout?.textVerticalAlign ?? "top";
  const width = layout?.width ?? "full";
  const align: HorizontalAlign = layout?.align ?? "left";
  const rowAlign: VerticalAlign = layout?.rowAlign ?? "top";

  const set = (fields: Parameters<typeof updateBlockAlignmentAction>[1]) =>
    updateBlockAlignmentAction(block.id, fields);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Alignment"
        aria-expanded={open}
        className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary"
      >
        <AlignHorizontalJustifyCenter className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute top-0 right-7 z-20 flex w-56 flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3 shadow-lg">
          <div className="flex flex-col gap-1.5">
            <span className="font-ui text-xs font-medium text-secondary">Text align</span>
            <div className="flex gap-1">
              {(
                [
                  { value: "left" as const, Icon: AlignLeft },
                  { value: "center" as const, Icon: AlignCenter },
                  { value: "right" as const, Icon: AlignRight },
                ]
              ).map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={textAlign === value}
                  aria-label={`Align text ${value}`}
                  onClick={() => set({ textAlign: value })}
                  className={`flex size-8 items-center justify-center rounded border ${
                    textAlign === value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-secondary hover:text-primary"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>

          {SUPPORTS_TEXT_VERTICAL_ALIGN.has(block.type) && (
            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-xs font-medium text-secondary">Text vertical align</span>
              <div className="flex gap-1">
                {(
                  [
                    { value: "top" as const, Icon: AlignVerticalJustifyStart },
                    { value: "middle" as const, Icon: AlignVerticalJustifyCenter },
                    { value: "bottom" as const, Icon: AlignVerticalJustifyEnd },
                  ]
                ).map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={textVerticalAlign === value}
                    aria-label={`Align text ${value} vertically`}
                    onClick={() => set({ textVerticalAlign: value })}
                    className={`flex size-8 items-center justify-center rounded border ${
                      textVerticalAlign === value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-secondary hover:text-primary"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {inRow ? (
            <div className="flex flex-col gap-1.5">
              <span className="font-ui text-xs font-medium text-secondary">Block vertical align</span>
              <div className="flex gap-1">
                {(
                  [
                    { value: "top" as const, Icon: AlignStartVertical },
                    { value: "middle" as const, Icon: AlignCenterVertical },
                    { value: "bottom" as const, Icon: AlignEndVertical },
                  ]
                ).map(({ value, Icon }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rowAlign === value}
                    aria-label={`Align block ${value} in row`}
                    onClick={() => set({ rowAlign: value })}
                    className={`flex size-8 items-center justify-center rounded border ${
                      rowAlign === value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-secondary hover:text-primary"
                    }`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="font-ui text-xs font-medium text-secondary">Block width</span>
                <select
                  value={width}
                  onChange={(e) => set({ width: e.target.value as typeof width })}
                  className="rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary"
                >
                  {WIDTH_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {width !== "full" && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-ui text-xs font-medium text-secondary">Block position</span>
                  <div className="flex gap-1">
                    {(
                      [
                        { value: "left" as const, Icon: AlignHorizontalJustifyStart },
                        { value: "center" as const, Icon: AlignHorizontalJustifyCenter },
                        { value: "right" as const, Icon: AlignHorizontalJustifyEnd },
                      ]
                    ).map(({ value, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={align === value}
                        aria-label={`Position block ${value}`}
                        onClick={() => set({ align: value })}
                        className={`flex size-8 items-center justify-center rounded border ${
                          align === value
                            ? "border-accent bg-accent/10 text-accent"
                            : "border-border text-secondary hover:text-primary"
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
