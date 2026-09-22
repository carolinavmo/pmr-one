"use client";

import { useRef, useState, type ReactNode } from "react";
import {
  Star,
  Palette,
  Plus,
  X,
  ImagePlus,
  PanelTop,
  PanelLeft,
  PanelRight,
  Maximize2,
  Crosshair,
  Crop,
  Shrink,
  Expand,
} from "lucide-react";
import type {
  HighlightTableBlock,
  RichTableColumnType,
  RichTableCellValue,
} from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateBlockTextAction,
  updateBlockRichTextAction,
  updateHighlightTableAction,
  setBlockCardColorAction,
  uploadHighlightCardImageAction,
  removeHighlightCardImageAction,
  setHighlightCardImagePositionAction,
  setHighlightCardImageWidthAction,
  setHighlightCardImageFocalPointAction,
  setHighlightCardImageFitAction,
} from "@/lib/actions/authoring";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { EditableText } from "@/components/ui/EditableText";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { ZoomableImage } from "@/components/ui/ZoomableImage";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { sanitizeRichText } from "@/lib/rich-text";
import {
  CARD_COLOR_CARD_ACCENT,
  CARD_COLOR_CHIP,
  CARD_COLOR_TEXT,
  CARD_COLOR_BADGE,
  CARD_COLOR_BORDER,
  CARD_COLOR_BORDER_STRONG,
} from "@/lib/card-colors";
import { FOCAL_POINT_OPTIONS, FOCAL_POINT_CLASS, type ImageFocalPoint } from "@/lib/image-focal-point";

type Column = HighlightTableBlock["columns"][number];
type Row = HighlightTableBlock["rows"][number];
type IconListItem = { icon?: string; label: string };
type ScaleValue = { label: string; value: number };
type ImagePosition = NonNullable<HighlightTableBlock["imagePosition"]>;
type ImageWidth = NonNullable<HighlightTableBlock["imageWidth"]>;
type ImageFit = NonNullable<HighlightTableBlock["imageFit"]>;

// Same fixed 5-step scale as RichTableBlock's own SCALE_MAX.
const SCALE_MAX = 5;

// Identical image vocabulary to HighlightCardBlock's own — same
// actions are reused (they're blockId-keyed content_config writers,
// not type-specific), so the options have to match exactly.
const FIT_OPTIONS: { value: ImageFit; label: string; icon: typeof Crop }[] = [
  { value: "cover", label: "Crop to fill", icon: Crop },
  { value: "contain", label: "Fit inside, no crop (letterboxed)", icon: Shrink },
  { value: "original", label: "Natural size, no fixed box", icon: Expand },
];

const POSITION_OPTIONS: { value: ImagePosition; label: string; icon: typeof PanelTop }[] = [
  { value: "top", label: "Image above table", icon: PanelTop },
  { value: "left", label: "Image left of table", icon: PanelLeft },
  { value: "right", label: "Image right of table", icon: PanelRight },
];

const WIDTH_OPTIONS: { value: ImageWidth; label: string }[] = [
  { value: "1/4", label: "25%" },
  { value: "1/3", label: "33%" },
  { value: "1/2", label: "50%" },
  { value: "2/3", label: "66%" },
  { value: "3/4", label: "75%" },
  { value: "full", label: "100%" },
];

const imageWidthClass: Record<ImageWidth, string> = {
  "1/4": "w-1/4",
  "1/3": "w-1/3",
  "1/2": "w-1/2",
  "2/3": "w-2/3",
  "3/4": "w-3/4",
  full: "w-full",
};

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

// Highlight Card's chrome (icon chip + colorable eyebrow label,
// Palette color picker) wrapped around Rich Table's own structured
// columns/rows instead of prose — see the type's own comment in
// editorial-blocks.ts for why this is a separate block rather than
// folding a table option into HighlightCardBlockView itself. The
// table-editing logic below (column types, icon-list/scale cells,
// add/remove row/column, IconPickerButton) is Rich Table's own,
// duplicated rather than shared — same "each block owns its small
// pieces" pattern the rest of this codebase already follows, not an
// oversight.
export function HighlightTableBlockView({
  block,
  isSignedIn = false,
}: {
  block: HighlightTableBlock;
  isSignedIn?: boolean;
}) {
  const { editing } = useEditMode();
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [title, setTitle] = useState(block.title ?? "");
  const [badgeColumnTitle, setBadgeColumnTitle] = useState(block.badgeColumnTitle ?? "");
  const [columns, setColumns] = useState<Column[]>(block.columns);
  const [rows, setRows] = useState<Row[]>(block.rows);
  const [showBadgeColumn, setShowBadgeColumn] = useState(block.showBadgeColumn ?? true);
  const [text, setText] = useState(block.text ?? "");
  const color = block.color ?? "accent";

  const [imageUrl, setImageUrl] = useState(block.imageUrl);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePosition, setImagePosition] = useState<ImagePosition>(block.imagePosition ?? "top");
  const [imageWidth, setImageWidth] = useState<ImageWidth | undefined>(block.imageWidth);
  const [widthOpen, setWidthOpen] = useState(false);
  const [imageFocalPoint, setImageFocalPoint] = useState<ImageFocalPoint>(block.imageFocalPoint ?? "center");
  const [focalPointOpen, setFocalPointOpen] = useState(false);
  const [imageFit, setImageFit] = useState<ImageFit>(block.imageFit ?? "cover");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSideBySide = imagePosition !== "top";
  const isCover = imageFit === "cover";
  const boxAspectClass = imageFit !== "original" ? "aspect-[4/3]" : "";
  const imgFitClass = isCover
    ? `size-full object-cover ${FOCAL_POINT_CLASS[imageFocalPoint]}`
    : imageFit === "contain"
      ? "size-full object-contain"
      : "w-full";
  const effectiveWidth: ImageWidth = imageWidth ?? (isSideBySide ? "1/4" : "full");
  const imageSizeClass = `${imageWidthClass[effectiveWidth]} ${
    isSideBySide ? "shrink-0" : effectiveWidth !== "full" ? "mx-auto" : ""
  }`;

  const handleImageFile = async (file: File) => {
    setUploadingImage(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadHighlightCardImageAction(block.id, formData);
      setImageUrl(URL.createObjectURL(file));
    } finally {
      setUploadingImage(false);
    }
  };

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
    updateHighlightTableAction(
      block.id,
      nextTitle,
      nextBadgeColumnTitle,
      nextColumns,
      nextRows,
      showBadgeColumn
    );
  };

  const toggleBadgeColumn = () => {
    const next = !showBadgeColumn;
    setShowBadgeColumn(next);
    updateHighlightTableAction(block.id, title, badgeColumnTitle, columns, rows, next);
  };

  const saveCell = async (rowIndex: number, colIndex: number, html: string) => {
    const nextRows = rows.map((r, i) =>
      i === rowIndex ? { ...r, cells: r.cells.map((c, j) => (j === colIndex ? html : c)) } : r
    );
    commit(title, badgeColumnTitle, columns, nextRows);
  };

  const labelRow = (
    <div className="flex items-center gap-2">
      <span
        className={`flex size-6 shrink-0 items-center justify-center rounded-full ${CARD_COLOR_CHIP[color]}`}
      >
        <Star className="size-3.5" aria-hidden="true" />
      </span>
      <EditableText
        as="span"
        multiline={false}
        className={`font-ui text-xs font-semibold ${CARD_COLOR_TEXT[color]}`}
        value={block.label}
        onSave={(value) => updateBlockTextAction(block.id, "label", value)}
      />
    </div>
  );

  // Rendered via RichEditableText in both reader and editor views
  // (not a plain dangerouslySetInnerHTML paragraph) so it picks up
  // the same list/blockquote styling every other rich-text field
  // gets — a raw paragraph strips <ul>/<ol> markers entirely (Tailwind's
  // preflight reset), which is exactly the "bullets disappear" bug
  // this replaced.
  const titleField = (
    <RichEditableText
      value={title}
      onSave={async (html) => commit(html, badgeColumnTitle, columns, rows)}
      placeholder="Table title (optional)"
      className="w-full font-reading text-base text-primary"
    />
  );

  // Optional continuation below the table — same field/action
  // HighlightCardBlock's own body text uses (updateBlockRichTextAction
  // with field "text"), just placed after the table instead of being
  // the block's only content. Reader view skips it entirely when
  // empty, same as the table's own optional title above.
  const bodyText = (
    <RichEditableText
      as="p"
      className="font-reading text-base text-primary"
      value={text}
      onSave={async (value) => {
        setText(value);
        await updateBlockRichTextAction(block.id, "text", value);
      }}
      placeholder="Additional text (optional)…"
    />
  );

  // Positioning/sizing only matter once an image exists — same
  // "nothing to offer on an empty upload prompt" reasoning as
  // HighlightCardBlockView's own imageControls.
  const imageControls = editing && imageUrl && (
    <div className="flex flex-wrap items-center gap-1">
      {POSITION_OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={imagePosition === value}
          onClick={() => {
            setImagePosition(value);
            setHighlightCardImagePositionAction(block.id, value);
          }}
          className={`flex size-6 items-center justify-center rounded transition-colors duration-base ${
            imagePosition === value
              ? "bg-surface-raised text-primary"
              : "text-secondary hover:bg-surface-raised hover:text-primary"
          }`}
        >
          <Icon className="size-3.5" aria-hidden="true" />
        </button>
      ))}
      <div className="relative">
        <button
          type="button"
          onClick={() => setWidthOpen((open) => !open)}
          aria-label="Image width"
          className="flex items-center gap-0.5 rounded px-1 py-0.5 font-ui text-xs text-secondary hover:bg-surface-raised hover:text-primary"
        >
          <Maximize2 className="size-3" aria-hidden="true" />
          {WIDTH_OPTIONS.find((o) => o.value === effectiveWidth)?.label}
        </button>
        {widthOpen && (
          <div className="absolute top-6 left-0 z-10 w-36 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
            <div className="flex flex-wrap gap-1">
              {WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setWidthOpen(false);
                    setImageWidth(option.value);
                    setHighlightCardImageWidthAction(block.id, option.value);
                  }}
                  className={`rounded border px-1.5 py-1 font-ui text-xs ${
                    effectiveWidth === option.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {isCover && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setFocalPointOpen((open) => !open)}
            aria-label="Image focal point"
            className="flex items-center gap-0.5 rounded px-1 py-0.5 font-ui text-xs text-secondary hover:bg-surface-raised hover:text-primary"
          >
            <Crosshair className="size-3" aria-hidden="true" />
          </button>
          {focalPointOpen && (
            <div className="absolute top-6 left-0 z-10 w-36 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
              <div className="grid grid-cols-3 gap-1">
                {FOCAL_POINT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    title={option.label}
                    aria-label={option.label}
                    onClick={() => {
                      setFocalPointOpen(false);
                      setImageFocalPoint(option.value);
                      setHighlightCardImageFocalPointAction(block.id, option.value);
                    }}
                    className={`flex size-8 items-center justify-center rounded border ${
                      imageFocalPoint === option.value
                        ? "border-accent bg-accent/10"
                        : "border-border hover:border-accent"
                    }`}
                  >
                    <span
                      className={`size-1.5 rounded-full ${
                        imageFocalPoint === option.value ? "bg-accent" : "bg-secondary/50"
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex items-center gap-0.5 rounded border border-border p-0.5">
        {FIT_OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={imageFit === value}
            onClick={() => {
              setImageFit(value);
              setHighlightCardImageFitAction(block.id, value);
            }}
            className={`flex size-6 items-center justify-center rounded transition-colors duration-base ${
              imageFit === value
                ? "bg-accent/10 text-accent"
                : "text-secondary hover:bg-border/40 hover:text-primary"
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );

  const imageBlock = editing ? (
    <div className={`flex flex-col gap-1.5 ${imageSizeClass}`}>
      {imageUrl ? (
        <div className={`relative ${boxAspectClass} overflow-hidden rounded-md w-full`}>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as HighlightCardBlockView). */}
          <img src={imageUrl} alt="" className={imgFitClass} />
          <button
            type="button"
            aria-label="Remove image"
            onClick={() => {
              setImageUrl(undefined);
              removeHighlightCardImageAction(block.id);
            }}
            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-surface-raised text-secondary shadow-sm hover:text-warning"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploadingImage}
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex w-fit items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 font-ui text-xs text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
        >
          <ImagePlus className="size-3" aria-hidden="true" />
          {uploadingImage ? "Uploading…" : "Add image"}
        </button>
      )}
      {imageControls}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
          e.target.value = "";
        }}
      />
    </div>
  ) : (
    imageUrl && (
      <div className={`${boxAspectClass} overflow-hidden rounded-md ${imageSizeClass}`}>
        <ZoomableImage src={imageUrl} alt={block.imageAlt ?? ""} enabled={isSignedIn}>
          {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL, no fixed remote-pattern domain configured yet (same reasoning as HighlightCardBlockView). */}
          <img src={imageUrl} alt={block.imageAlt ?? ""} className={imgFitClass} />
        </ZoomableImage>
      </div>
    )
  );

  if (!editing) {
    if (columns.length === 0) return null;

    const tableBody = (
      <>
        {title && titleField}
        <div className={`overflow-hidden rounded-lg border bg-surface ${CARD_COLOR_BORDER_STRONG[color]}`}>
          <table className="w-full border-collapse font-reading text-xs">
            <thead>
              <tr className={CARD_COLOR_BADGE[color]}>
                {showBadgeColumn && (
                  <th className="w-12 px-2 py-2 text-center font-ui text-xs font-bold tracking-wider uppercase">
                    {badgeColumnTitle}
                  </th>
                )}
                {columns.map((column, i) => (
                  <th key={i} className="px-3 py-2 text-left font-ui text-xs font-bold tracking-wider uppercase">
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
                  <tr key={rowIndex} className={`border-b last:border-0 ${CARD_COLOR_BORDER[color]}`}>
                    {showBadgeColumn && (
                      <td className="px-2 py-2 text-center align-middle">
                        <span
                          className={`mx-auto flex size-6 items-center justify-center rounded-full border-2 border-current font-ui text-xs font-semibold ${CARD_COLOR_TEXT[color]}`}
                        >
                          {BadgeIcon ? <BadgeIcon className="size-3.5" aria-hidden="true" /> : rowIndex + 1}
                        </span>
                      </td>
                    )}
                    {columns.map((column, colIndex) => (
                      <td key={colIndex} className="px-3 py-2 align-middle text-primary">
                        <HighlightTableCellView type={column.type} value={row.cells[colIndex]} />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {text && bodyText}
      </>
    );

    const tableColumn = (
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        {labelRow}
        {tableBody}
      </div>
    );

    return (
      <div
        className={`relative flex p-4 ${
          isSideBySide ? "flex-row items-start gap-3" : "flex-col gap-2"
        } ${CARD_COLOR_CARD_ACCENT[color]}`}
      >
        {isSideBySide && imagePosition === "left" && imageBlock}
        {isSideBySide ? (
          tableColumn
        ) : (
          <>
            {labelRow}
            {imageBlock}
            {tableBody}
          </>
        )}
        {isSideBySide && imagePosition === "right" && imageBlock}
      </div>
    );
  }

  const editBody = (
    <>
      {titleField}
      <label className="flex w-fit items-center gap-1.5 font-ui text-xs text-secondary">
        <input
          type="checkbox"
          checked={showBadgeColumn}
          onChange={toggleBadgeColumn}
          className="size-3.5 accent-accent"
        />
        Show row numbers
      </label>
      <div className="overflow-x-auto rounded-lg border border-dashed border-border bg-surface p-2">
        <table className="w-full border-collapse font-ui text-sm">
          <thead>
            <tr className="border-b border-border">
              {showBadgeColumn && (
                <th className="w-16 p-1 align-top">
                  <input
                    value={badgeColumnTitle}
                    placeholder="e.g. Phase"
                    onChange={(e) => setBadgeColumnTitle(e.target.value)}
                    onBlur={() => commit(title, badgeColumnTitle, columns, rows)}
                    className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-1 text-center font-medium text-primary outline-none hover:border-border focus:border-accent"
                  />
                </th>
              )}
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
                {showBadgeColumn && (
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
                )}
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="p-1 align-top">
                    {column.type === "text" && (
                      <RichEditableText
                        as="div"
                        value={typeof row.cells[colIndex] === "string" ? (row.cells[colIndex] as string) : ""}
                        onSave={(html) => saveCell(rowIndex, colIndex, html)}
                        className="min-w-24 text-secondary"
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
        <div className="mt-2 flex gap-2">
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
      {bodyText}
    </>
  );

  const editColumn = (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      {labelRow}
      {editBody}
    </div>
  );

  return (
    <div
      className={`relative flex p-4 ${
        isSideBySide ? "flex-row items-start gap-3" : "flex-col gap-3"
      } ${CARD_COLOR_CARD_ACCENT[color]}`}
    >
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
              setBlockCardColorAction(block.id, next);
            }}
          />
        )}
      </div>
      {isSideBySide && imagePosition === "left" && imageBlock}
      {isSideBySide ? (
        editColumn
      ) : (
        <>
          {labelRow}
          {imageBlock}
          {editBody}
        </>
      )}
      {isSideBySide && imagePosition === "right" && imageBlock}
    </div>
  );
}

function HighlightTableCellView({
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

  return (
    <span
      dangerouslySetInnerHTML={{ __html: sanitizeRichText(typeof value === "string" ? value : "") }}
    />
  );
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
