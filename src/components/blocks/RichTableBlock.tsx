"use client";

import { useState, type ReactNode } from "react";
import { Plus, X } from "lucide-react";
import type {
  RichTableBlock,
  RichTableColumnType,
  RichTableCellValue,
} from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateRichTableAction } from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { RichEditableText } from "@/components/ui/RichEditableText";

type Column = RichTableBlock["columns"][number];
type Row = RichTableBlock["rows"][number];
type IconListItem = { icon?: string; label: string };
type ScaleValue = { label: string; value: number };

// Fixed rather than author-configurable — every reference case for
// this block wants a 5-step low-to-high read, and a per-column max
// would add a whole extra control for a distinction no one asked for.
const SCALE_MAX = 5;

const COLUMN_TYPE_LABEL: Record<RichTableColumnType, string> = {
  text: "Text",
  icon_list: "Icon list",
  scale: "Scale",
};

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

function emptyCellFor(type: RichTableColumnType): RichTableCellValue {
  switch (type) {
    case "icon_list":
      return [];
    case "scale":
      return { label: "", value: 1 };
    default:
      return "";
  }
}

function asIconList(value: RichTableCellValue | undefined): IconListItem[] {
  return Array.isArray(value) ? value : [];
}

function asScale(value: RichTableCellValue | undefined): ScaleValue {
  return value && typeof value === "object" && !Array.isArray(value) && "value" in value
    ? (value as ScaleValue)
    : { label: "", value: 1 };
}

// A generic structured-overview table: a leading numbered/icon badge
// per row, plus per-column cell types (plain text, an icon+label
// list, or a labeled dot-scale) — distinct from Comparison Table's
// plain string grid. Columns/types are author-configured per table,
// not hardcoded to any one domain (e.g. rehab), so the same block
// works for a workup comparison, a severity grading table, etc.
// `title` is the only RichEditableText field here — it sits outside
// the grid. Column headers and cell values stay plain: they live
// inside `<table>`/`<td>` cells narrow enough that a floating rich
// toolbar would break the tabular layout, the same reasoning Tabs'
// own checklist columns are excluded under (structured summary data,
// not prose).
export function RichTableBlockView({
  block,
  diseaseSlug,
}: {
  block: RichTableBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [title, setTitle] = useState(block.title ?? "");
  const [badgeColumnTitle, setBadgeColumnTitle] = useState(block.badgeColumnTitle ?? "");
  const [columns, setColumns] = useState<Column[]>(block.columns);
  const [rows, setRows] = useState<Row[]>(block.rows);

  const commit = (
    nextTitle: string,
    nextBadgeColumnTitle: string,
    nextColumns: Column[],
    nextRows: Row[]
  ) => {
    setTitle(nextTitle);
    setBadgeColumnTitle(nextBadgeColumnTitle);
    setColumns(nextColumns);
    setRows(nextRows);
    updateRichTableAction(block.id, nextTitle, nextBadgeColumnTitle, nextColumns, nextRows);
  };

  if (!editing) {
    if (columns.length === 0) return null;
    return (
      <div className="flex flex-col gap-2">
        {title && (
          <RichEditableText
            as="h3"
            value={title}
            onSave={async (html) => commit(html, badgeColumnTitle, columns, rows)}
            placeholder=""
            className="font-reading text-lg text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
        )}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-max border-collapse font-ui text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-raised">
                <th className="w-14 px-2 py-2 text-center font-medium text-primary">
                  {badgeColumnTitle}
                </th>
                {columns.map((column, i) => (
                  <th key={i} className="px-3 py-2 text-left font-medium text-primary">
                    {column.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const BadgeIcon =
                  row.badgeIcon && isCardIconName(row.badgeIcon) ? cardIcons[row.badgeIcon] : null;
                return (
                  <tr key={rowIndex} className="border-b border-border last:border-0">
                    <td className="px-2 py-3 text-center">
                      <span className="mx-auto flex size-8 items-center justify-center rounded-full border-2 border-trust font-ui text-sm font-semibold text-trust">
                        {BadgeIcon ? <BadgeIcon className="size-4" aria-hidden="true" /> : rowIndex + 1}
                      </span>
                    </td>
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className="px-3 py-3 align-top text-secondary">
                        <RichTableCellView type={column.type} value={row.cells[colIndex]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <RichEditableText
        value={title}
        onSave={async (html) => commit(html, badgeColumnTitle, columns, rows)}
        placeholder="Table title (optional)"
        className="w-full font-reading text-lg text-primary"
        block={block}
        diseaseSlug={diseaseSlug}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="w-16 p-1 align-top">
                <input
                  value={badgeColumnTitle}
                  placeholder="e.g. Phase"
                  onChange={(e) => setBadgeColumnTitle(e.target.value)}
                  onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                  className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-center font-medium text-primary outline-none hover:border-border focus:border-accent"
                />
              </th>
              {columns.map((column, colIndex) => (
                <th key={colIndex} className="min-w-32 p-1 align-top">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <input
                        value={column.title}
                        placeholder="Column title"
                        onChange={(e) =>
                          setColumns((current) =>
                            current.map((c, i) => (i === colIndex ? { ...c, title: e.target.value } : c))
                          )
                        }
                        onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-left font-medium text-primary outline-none hover:border-border focus:border-accent"
                      />
                      {columns.length > 1 && (
                        <button
                          type="button"
                          aria-label="Delete column"
                          onClick={() => {
                            const nextColumns = columns.filter((_, i) => i !== colIndex);
                            const nextRows = rows.map((r) => ({
                              ...r,
                              cells: r.cells.filter((_, i) => i !== colIndex),
                            }));
                            commit(title, badgeColumnTitle, nextColumns, nextRows);
                          }}
                          className="flex size-5 shrink-0 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                        >
                          <X className="size-3" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                    <select
                      value={column.type}
                      onChange={(e) => {
                        const nextType = e.target.value as RichTableColumnType;
                        const nextColumns = columns.map((c, i) =>
                          i === colIndex ? { ...c, type: nextType } : c
                        );
                        const nextRows = rows.map((r) => ({
                          ...r,
                          cells: r.cells.map((cell, i) => (i === colIndex ? emptyCellFor(nextType) : cell)),
                        }));
                        commit(title, badgeColumnTitle, nextColumns, nextRows);
                      }}
                      className="w-full rounded border border-border bg-surface px-1 py-0.5 font-ui text-xs text-secondary outline-none focus:border-accent"
                    >
                      {(Object.keys(COLUMN_TYPE_LABEL) as RichTableColumnType[]).map((t) => (
                        <option key={t} value={t}>
                          {COLUMN_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-b border-border last:border-0">
                <td className="p-1 text-center align-top">
                  <IconPickerButton
                    icon={row.badgeIcon}
                    allowClear
                    fallback={<span className="font-ui text-xs">{rowIndex + 1}</span>}
                    onPick={(icon) => {
                      const nextRows = rows.map((r, i) => (i === rowIndex ? { ...r, badgeIcon: icon } : r));
                      commit(title, badgeColumnTitle, columns, nextRows);
                    }}
                  />
                </td>
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-1 align-top">
                    {column.type === "text" && (
                      <input
                        value={typeof row.cells[colIndex] === "string" ? (row.cells[colIndex] as string) : ""}
                        onChange={(e) => {
                          const next = rows.map((r, i) =>
                            i === rowIndex
                              ? { ...r, cells: r.cells.map((c, j) => (j === colIndex ? e.target.value : c)) }
                              : r
                          );
                          setRows(next);
                        }}
                        onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                        className="w-full min-w-24 rounded border border-transparent bg-transparent px-1.5 py-1 text-secondary outline-none hover:border-border focus:border-accent"
                      />
                    )}

                    {column.type === "icon_list" && (
                      <div className="flex flex-col gap-1">
                        {asIconList(row.cells[colIndex]).map((item, itemIndex) => (
                          <div key={itemIndex} className="flex items-center gap-1">
                            <IconPickerButton
                              icon={item.icon}
                              onPick={(icon) => {
                                const nextRows = rows.map((r, i) =>
                                  i === rowIndex
                                    ? {
                                        ...r,
                                        cells: r.cells.map((c, j) =>
                                          j === colIndex
                                            ? asIconList(c).map((it, k) =>
                                                k === itemIndex ? { ...it, icon } : it
                                              )
                                            : c
                                        ),
                                      }
                                    : r
                                );
                                commit(title, badgeColumnTitle, columns, nextRows);
                              }}
                            />
                            <input
                              value={item.label}
                              placeholder="Item"
                              onChange={(e) => {
                                const nextRows = rows.map((r, i) =>
                                  i === rowIndex
                                    ? {
                                        ...r,
                                        cells: r.cells.map((c, j) =>
                                          j === colIndex
                                            ? asIconList(c).map((it, k) =>
                                                k === itemIndex ? { ...it, label: e.target.value } : it
                                              )
                                            : c
                                        ),
                                      }
                                    : r
                                );
                                setRows(nextRows);
                              }}
                              onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-secondary outline-none hover:border-border focus:border-accent"
                            />
                            <button
                              type="button"
                              aria-label="Delete item"
                              onClick={() => {
                                const nextRows = rows.map((r, i) =>
                                  i === rowIndex
                                    ? {
                                        ...r,
                                        cells: r.cells.map((c, j) =>
                                          j === colIndex
                                            ? asIconList(c).filter((_, k) => k !== itemIndex)
                                            : c
                                        ),
                                      }
                                    : r
                                );
                                commit(title, badgeColumnTitle, columns, nextRows);
                              }}
                              className="shrink-0 rounded p-0.5 text-secondary hover:bg-warning/10 hover:text-warning"
                            >
                              <X className="size-3" aria-hidden="true" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            const nextRows = rows.map((r, i) =>
                              i === rowIndex
                                ? {
                                    ...r,
                                    cells: r.cells.map((c, j) =>
                                      j === colIndex ? [...asIconList(c), { label: "" }] : c
                                    ),
                                  }
                                : r
                            );
                            commit(title, badgeColumnTitle, columns, nextRows);
                          }}
                          className="flex w-fit items-center gap-1 rounded px-1 py-0.5 font-ui text-xs text-accent hover:bg-accent/10"
                        >
                          <Plus className="size-3" aria-hidden="true" />
                          Item
                        </button>
                      </div>
                    )}

                    {column.type === "scale" && (
                      <div className="flex min-w-36 flex-col gap-1">
                        <input
                          value={asScale(row.cells[colIndex]).label}
                          placeholder="Label (e.g. Low)"
                          onChange={(e) => {
                            const nextRows = rows.map((r, i) =>
                              i === rowIndex
                                ? {
                                    ...r,
                                    cells: r.cells.map((c, j) =>
                                      j === colIndex ? { ...asScale(c), label: e.target.value } : c
                                    ),
                                  }
                                : r
                            );
                            setRows(nextRows);
                          }}
                          onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                          className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-secondary outline-none hover:border-border focus:border-accent"
                        />
                        <div className="flex items-center gap-1 px-1.5">
                          {Array.from({ length: SCALE_MAX }).map((_, dotIndex) => {
                            const scale = asScale(row.cells[colIndex]);
                            return (
                              <button
                                key={dotIndex}
                                type="button"
                                aria-label={`Set level ${dotIndex + 1}`}
                                onClick={() => {
                                  const nextRows = rows.map((r, i) =>
                                    i === rowIndex
                                      ? {
                                          ...r,
                                          cells: r.cells.map((c, j) =>
                                            j === colIndex
                                              ? { ...asScale(c), value: dotIndex + 1 }
                                              : c
                                          ),
                                        }
                                      : r
                                  );
                                  commit(title, badgeColumnTitle, columns, nextRows);
                                }}
                                className={`size-3 rounded-full transition-colors duration-base ${
                                  dotIndex < scale.value ? "bg-trust" : "bg-border hover:bg-secondary/40"
                                }`}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </td>
                ))}
                <td className="w-8 p-1 text-center align-top">
                  {rows.length > 1 && (
                    <button
                      type="button"
                      aria-label="Delete row"
                      onClick={() =>
                        commit(title, badgeColumnTitle, columns, rows.filter((_, i) => i !== rowIndex))
                      }
                      className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() =>
            commit(title, badgeColumnTitle, columns, [
              ...rows,
              { cells: columns.map((c) => emptyCellFor(c.type)) },
            ])
          }
          className="flex items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add row
        </button>
        <button
          type="button"
          onClick={() =>
            commit(
              title,
              badgeColumnTitle,
              [...columns, { title: "", type: "text" }],
              rows.map((r) => ({ ...r, cells: [...r.cells, ""] }))
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

function RichTableCellView({
  type,
  value,
}: {
  type: RichTableColumnType;
  value: RichTableCellValue | undefined;
}) {
  if (type === "icon_list") {
    const items = asIconList(value);
    if (items.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item, i) => {
          const Icon = item.icon && isCardIconName(item.icon) ? cardIcons[item.icon] : null;
          return (
            <span key={i} className="flex items-center gap-1.5">
              {Icon && <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" />}
              <span>{item.label}</span>
            </span>
          );
        })}
      </div>
    );
  }

  if (type === "scale") {
    const scale = asScale(value);
    return (
      <div className="flex items-center gap-2">
        {scale.label && <span className="font-medium text-primary">{scale.label}</span>}
        <span className="flex items-center gap-1">
          {Array.from({ length: SCALE_MAX }).map((_, i) => (
            <span
              key={i}
              className={`size-2 rounded-full ${i < scale.value ? "bg-trust" : "bg-border"}`}
            />
          ))}
        </span>
      </div>
    );
  }

  return <>{typeof value === "string" ? value : ""}</>;
}

function IconPickerButton({
  icon,
  allowClear,
  fallback,
  onPick,
}: {
  icon?: string;
  allowClear?: boolean;
  fallback?: ReactNode;
  onPick: (icon: string | undefined) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Pick icon"
        className="flex size-6 shrink-0 items-center justify-center rounded border border-border bg-surface-raised text-secondary hover:text-primary"
      >
        {Icon ? (
          <Icon className="size-3.5" aria-hidden="true" />
        ) : (
          fallback ?? <Plus className="size-3" aria-hidden="true" />
        )}
      </button>
      {open && (
        <div className="absolute top-7 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
          {allowClear && (
            <button
              type="button"
              title="Auto number"
              onClick={() => {
                setOpen(false);
                onPick(undefined);
              }}
              className="flex size-6 items-center justify-center rounded font-ui text-xs text-secondary hover:bg-border/40 hover:text-accent"
            >
              #
            </button>
          )}
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
