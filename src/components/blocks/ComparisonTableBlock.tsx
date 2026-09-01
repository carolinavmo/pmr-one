"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { ComparisonTableBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateComparisonTableAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { sanitizeRichText } from "@/lib/rich-text";

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

  const commit = (nextColumns: string[], nextRows: string[][]) => {
    setColumns(nextColumns);
    setRows(nextRows);
    updateComparisonTableAction(block.id, nextColumns, nextRows);
  };

  const saveColumn = async (colIndex: number, html: string) => {
    const nextColumns = columns.map((c, i) => (i === colIndex ? html : c));
    setColumns(nextColumns);
    await updateComparisonTableAction(block.id, nextColumns, rows);
  };

  const saveCell = async (rowIndex: number, colIndex: number, html: string) => {
    const nextRows = rows.map((r, i) =>
      i === rowIndex ? r.map((c, j) => (j === colIndex ? html : c)) : r
    );
    setRows(nextRows);
    await updateComparisonTableAction(block.id, columns, nextRows);
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        {block.caption && <p className="font-ui text-sm text-secondary">{block.caption}</p>}
        <div className="rounded-lg border border-border">
          <table className="w-full border-collapse font-ui text-sm">
            <thead>
              <tr className="border-b border-border bg-[#128A99]/10">
                {block.columns.map((column, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-medium text-black"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(column) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-border last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-3 py-2 text-black"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(cell) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
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
      </div>
    </div>
  );
}
