"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ComparisonTableBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateComparisonTableAction, setComparisonTableHeaderHiddenAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { sanitizeRichText, richTextToPlainText } from "@/lib/rich-text";
import { TEXT_ALIGN_CLASS } from "@/lib/block-alignment";
import { preserveScrollAcrossSave } from "@/lib/preserve-scroll";

// A row with text only in its first cell (every other cell empty) is a
// group separator — a full-width label row that divides a long table
// into labelled bands (e.g. "Back muscles — superficial group"),
// rather than a data row with missing values. Reader view only: the
// edit view still shows it as an ordinary row so it stays editable
// cell by cell.
function isSeparatorRow(row: string[]): boolean {
  if (row.length < 2) return false;
  const text = (cell: string) => richTextToPlainText(cell).trim();
  return text(row[0]) !== "" && row.slice(1).every((cell) => text(cell) === "");
}

// A grid, not a list — add/remove row and column controls sit at the
// grid's own edges rather than reusing the up/down reorder pattern
// every other multi-item block uses, since rows and columns don't
// have the same "step order" meaning a Timeline or algorithm does.
//
// Cells and column headers are RichEditableText, same toolbar
// (Bold/Italic/.../symbols) as every prose field — a table cell is
// still prose, just a short one, and a founder request specifically
// asked for the same formatting options here. Each cell's own
// onSave computes the *whole* next columns/rows array (RichEditableText
// only reports its own field's final value at blur, unlike an
// <input>'s per-keystroke onChange) and calls updateComparisonTableAction
// directly — commit() below stays for the add/delete row/column actions,
// which already operate on the full arrays.
export function ComparisonTableBlockView({
  block,
}: {
  block: ComparisonTableBlock;
}) {
  const { editing } = useEditMode();
  const [columns, setColumns] = useState<string[]>(block.columns);
  const [rows, setRows] = useState<string[][]>(block.rows);
  const [caption, setCaption] = useState<string>(block.caption ?? "");
  const [hideHeader, setHideHeader] = useState<boolean>(block.hideHeader ?? false);

  const commit = (nextColumns: string[], nextRows: string[][]) => {
    setColumns(nextColumns);
    setRows(nextRows);
    preserveScrollAcrossSave(() => updateComparisonTableAction(block.id, nextColumns, nextRows, caption));
  };

  const saveColumn = async (colIndex: number, html: string) => {
    const nextColumns = columns.map((c, i) => (i === colIndex ? html : c));
    setColumns(nextColumns);
    await preserveScrollAcrossSave(() => updateComparisonTableAction(block.id, nextColumns, rows, caption));
  };

  const saveCell = async (rowIndex: number, colIndex: number, html: string) => {
    const nextRows = rows.map((r, i) =>
      i === rowIndex ? r.map((c, j) => (j === colIndex ? html : c)) : r
    );
    setRows(nextRows);
    await preserveScrollAcrossSave(() => updateComparisonTableAction(block.id, columns, nextRows, caption));
  };

  const saveCaption = async (html: string) => {
    setCaption(html);
    await preserveScrollAcrossSave(() => updateComparisonTableAction(block.id, columns, rows, html));
  };

  const toggleHeader = (hidden: boolean) => {
    setHideHeader(hidden);
    preserveScrollAcrossSave(() => setComparisonTableHeaderHiddenAction(block.id, hidden));
  };

  const captionAlign = block.layout?.textAlign ?? "left";

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        {/* The caption is rich text (the editor saves HTML), so it has to be
            rendered as HTML — printing it as text showed stray "<br>" — and an
            emptied caption (just a <br>) counts as no caption. */}
        {block.caption && richTextToPlainText(block.caption).trim() && (
          <p
            className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[captionAlign]}`}
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(block.caption) }}
          />
        )}
        <div className="overflow-hidden rounded-lg border border-navy">
          <table className="w-full border-collapse font-reading text-sm">
            {!hideHeader && (
              <thead>
                <tr className="bg-navy">
                  {block.columns.map((column, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-ui text-xs font-bold tracking-wider text-white uppercase"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(column) }}
                    />
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, rowIndex) =>
                isSeparatorRow(row) ? (
                  <tr key={rowIndex} className="border-b border-navy/25 bg-navy/10 last:border-0">
                    <td
                      colSpan={block.columns.length}
                      className="px-3 py-1.5 font-ui text-xs font-bold tracking-wider text-navy uppercase"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(row[0]) }}
                    />
                  </tr>
                ) : (
                  <tr key={rowIndex} className="border-b border-navy/25 last:border-0">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2 text-primary"
                        dangerouslySetInnerHTML={{ __html: sanitizeRichText(cell) }}
                      />
                    ))}
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
        <RichEditableText
          value={caption}
          onSave={saveCaption}
          placeholder="Table caption (optional)"
          className={`font-ui text-sm text-secondary ${TEXT_ALIGN_CLASS[captionAlign]}`}
        />
        <table className="w-full border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((column, colIndex) => (
                <th key={colIndex} className="p-1">
                  <div className="flex items-start gap-1">
                    <RichEditableText
                      as="div"
                      value={column}
                      onSave={(html) => saveColumn(colIndex, html)}
                      className="min-w-24 flex-1 font-medium text-primary"
                    />
                    {columns.length > 1 && (
                      <button
                        type="button"
                        aria-label="Delete column"
                        onClick={() =>
                          commit(
                            columns.filter((_, i) => i !== colIndex),
                            rows.map((row) => row.filter((_, i) => i !== colIndex))
                          )
                        }
                        className="flex size-5 shrink-0 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="p-1 align-top">
                    <RichEditableText
                      as="div"
                      value={cell}
                      onSave={(html) => saveCell(rowIndex, cellIndex, html)}
                      className="min-w-24 text-secondary"
                    />
                  </td>
                ))}
                <td className="w-8 text-center">
                  <button
                    type="button"
                    aria-label="Delete row"
                    onClick={() => commit(columns, rows.filter((_, i) => i !== rowIndex))}
                    className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => commit(columns, [...rows, columns.map(() => "")])}
          className="flex items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add row
        </button>
        <button
          type="button"
          onClick={() =>
            commit(
              [...columns, ""],
              rows.map((row) => [...row, ""])
            )
          }
          className="flex items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add column
        </button>
        <label className="ml-auto flex items-center gap-1.5 font-ui text-xs text-secondary">
          <input
            type="checkbox"
            checked={!hideHeader}
            onChange={(e) => toggleHeader(!e.target.checked)}
            className="size-3.5 accent-accent"
          />
          Show header row
        </label>
      </div>
    </div>
  );
}
