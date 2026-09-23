"use client";

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ImageRun,
  ShadingType,
  AlignmentType,
  LevelFormat,
  BorderStyle,
} from "docx";

// HANDBOOK-SPEC.md Pass 6 — "Export a page to PDF, Markdown and Word,
// preserving headings, tasks, tables and cards." All three run
// entirely client-side against the note's already-rendered HTML:
// - Markdown: a small hand-written HTML→MD converter, since the
//   editor's whole tag vocabulary is fixed and known (rich-text.ts's
//   ALLOWED_TAGS) — not worth a general-purpose HTML-to-Markdown
//   dependency for ~15 element types.
// - PDF: the browser's own print-to-PDF (a new window with a
//   print-only stylesheet, then window.print()) rather than a new
//   server-side PDF-rendering dependency — "Save as PDF" from the
//   system print dialog is what actually runs, not a server-generated
//   file.
// - Word: docx-js (client-side; Packer.toBlob runs entirely in the
//   browser), a real .docx rather than an HTML-renamed-.doc trick.

function textOf(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  return Array.from(node.childNodes).map(textOf).join("");
}

// Inline formatting only (bold/italic/underline/strike/links) — block
// structure (headings/lists/tasks/tables/cards) is handled one level
// up in htmlToMarkdown, since Markdown's block syntax needs to know
// nesting depth/list-item index that an inline pass doesn't have.
function inlineToMarkdown(node: ChildNode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  const inner = Array.from(node.childNodes).map(inlineToMarkdown).join("");
  switch (node.tagName) {
    case "B":
    case "STRONG":
      return `**${inner}**`;
    case "I":
    case "EM":
      return `_${inner}_`;
    case "U":
      return `<u>${inner}</u>`; // Markdown has no native underline
    case "S":
      return `~~${inner}~~`;
    case "A": {
      const href = node.getAttribute("href");
      return href ? `[${inner}](${href})` : inner;
    }
    case "BR":
      return "  \n";
    default:
      return inner;
  }
}

function blockToMarkdown(el: HTMLElement): string {
  switch (el.tagName) {
    case "H1":
      return `# ${inlineToMarkdown(el)}\n\n`;
    case "H2":
      return `## ${inlineToMarkdown(el)}\n\n`;
    case "H3":
      return `### ${inlineToMarkdown(el)}\n\n`;
    case "P":
      return `${Array.from(el.childNodes).map(inlineToMarkdown).join("")}\n\n`;
    case "BLOCKQUOTE":
      return (
        Array.from(el.childNodes)
          .map((c) => (c instanceof HTMLElement ? blockToMarkdown(c) : inlineToMarkdown(c)))
          .join("")
          .trim()
          .split("\n")
          .map((line) => `> ${line}`)
          .join("\n") + "\n\n"
      );
    case "UL":
      return (
        Array.from(el.children)
          .map((li) => `- ${inlineToMarkdown(li as HTMLElement).trim()}`)
          .join("\n") + "\n\n"
      );
    case "OL":
      return (
        Array.from(el.children)
          .map((li, i) => `${i + 1}. ${inlineToMarkdown(li as HTMLElement).trim()}`)
          .join("\n") + "\n\n"
      );
    case "TABLE": {
      const rows = Array.from(el.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.children).map((cell) => inlineToMarkdown(cell as HTMLElement).trim() || " ")
      );
      if (rows.length === 0) return "";
      const header = rows[0];
      const body = rows.slice(1);
      const line = (cells: string[]) => `| ${cells.join(" | ")} |`;
      return [line(header), line(header.map(() => "---")), ...body.map(line)].join("\n") + "\n\n";
    }
    case "IMG": {
      const src = el.getAttribute("src") ?? "";
      const alt = el.getAttribute("alt") ?? "";
      return `![${alt}](${src})\n\n`;
    }
    case "DIV": {
      if (el.hasAttribute("data-checked")) {
        const checked = el.getAttribute("data-checked") === "true";
        return `- [${checked ? "x" : " "}] ${textOf(el).trim()}\n`;
      }
      if (el.hasAttribute("data-card-preset")) {
        const label = el.querySelector("span")?.textContent?.trim() ?? "";
        const body = el.querySelector("p") ? inlineToMarkdown(el.querySelector("p") as HTMLElement) : "";
        return `> **${label}**\n>\n> ${body}\n\n`;
      }
      // A plain unrecognized div (shouldn't occur given the sanitizer's
      // fixed vocabulary, but degrade gracefully rather than drop
      // content) — treat its children as block content.
      return Array.from(el.children)
        .map((c) => blockToMarkdown(c as HTMLElement))
        .join("");
    }
    default:
      return inlineToMarkdown(el);
  }
}

export function htmlToMarkdown(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  const parts: string[] = [];
  let paragraphBuffer: ChildNode[] = [];
  function flushParagraph() {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.map(inlineToMarkdown).join("").trim();
    if (text) parts.push(`${text}\n\n`);
    paragraphBuffer = [];
  }
  for (const child of Array.from(container.childNodes)) {
    if (child instanceof HTMLElement) {
      flushParagraph();
      parts.push(blockToMarkdown(child));
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      paragraphBuffer.push(child);
    }
  }
  flushParagraph();
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export function downloadMarkdown(title: string, html: string): void {
  const markdown = `# ${title}\n\n${htmlToMarkdown(html)}`;
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w\-]+/g, "-").toLowerCase() || "page"}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// A minimal standalone document, not this app's own stylesheet — the
// print window has none of the app's Tailwind build available to it,
// so the handful of classes the sanitizer allows (rich-text.ts) are
// re-declared here as plain CSS covering exactly that vocabulary.
const PRINT_STYLES = `
  body { font-family: Georgia, 'Times New Roman', serif; color: #27344A; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
  h1 { font-size: 28px; margin: 0 0 16px; }
  h1.doc-title { border-bottom: 2px solid #D9DFE8; padding-bottom: 12px; }
  h2, .content h1 { font-size: 22px; margin: 24px 0 8px; }
  h3 { font-size: 18px; margin: 20px 0 8px; }
  p { margin: 0 0 12px; }
  ul, ol { margin: 0 0 12px 24px; }
  li { margin-bottom: 4px; }
  blockquote { border-left: 3px solid #D9DFE8; padding-left: 12px; margin: 12px 0; color: #5E6B80; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 12px 0; }
  th, td { border: 1px solid #D9DFE8; padding: 6px 8px; text-align: left; }
  th { background: #F7F9FB; }
  img { max-width: 100%; border-radius: 8px; margin: 12px 0; }
  [data-checked] { list-style: none; padding-left: 22px; position: relative; margin-bottom: 4px; }
  [data-checked]::before { position: absolute; left: 0; }
  [data-checked="true"]::before { content: "☑"; }
  [data-checked="false"]::before { content: "☐"; }
  [data-checked="true"] { text-decoration: line-through; color: #5E6B80; }
  [data-card-preset] { border-radius: 13px; padding: 14px 18px; margin: 14px 0; background: #F7F9FB; }
  [data-card-preset] > span { display: block; font-size: 11px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; margin-bottom: 6px; }
  .font-bold { font-weight: 700; }
  .italic { font-style: italic; }
  .underline { text-decoration: underline; }
  .line-through { text-decoration: line-through; }
  @media print { body { margin: 0; padding: 24px; } }
`;

export function printPageAsPdf(title: string, html: string): void {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${PRINT_STYLES}</style></head><body><h1 class="doc-title">${title}</h1><div class="content">${html}</div></body></html>`);
  win.document.close();
  win.onload = () => {
    win.focus();
    win.print();
  };
}

// Word export — a real .docx via docx-js (client-side; Packer.toBlob
// runs in the browser), covering exactly the sanitizer's fixed tag
// vocabulary (rich-text.ts's ALLOWED_TAGS), same "one converter per
// export format" shape as htmlToMarkdown above. Images are fetched and
// embedded as real ImageRuns (this app's own /api/uploads/ URLs are
// same-origin, so a plain fetch works); an image whose extension isn't
// one of docx's four supported raster types is skipped rather than
// failing the whole export.
const DOCX_TABLE_WIDTH_DXA = 9000;
const DOCX_IMAGE_MAX_WIDTH_PX = 500;
const DOCX_OL_NUMBERING_REFERENCE = "atlas-ol";

interface DocxInlineStyle {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
}

function docxInlineRuns(node: ChildNode, style: DocxInlineStyle = {}): InstanceType<typeof TextRun>[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    if (!text) return [];
    return [
      new TextRun({
        text,
        bold: style.bold,
        italics: style.italics,
        underline: style.underline ? {} : undefined,
        strike: style.strike,
      }),
    ];
  }
  if (!(node instanceof HTMLElement)) return [];
  if (node.tagName === "BR") return [new TextRun({ text: "", break: 1 })];
  const next: DocxInlineStyle = { ...style };
  switch (node.tagName) {
    case "B":
    case "STRONG":
      next.bold = true;
      break;
    case "I":
    case "EM":
      next.italics = true;
      break;
    case "U":
      next.underline = true;
      break;
    case "S":
      next.strike = true;
      break;
    case "A":
      // No functioning hyperlink field — an internal atlas-link-id
      // anchor has no stable external URL to point Word at, so this
      // just keeps the visual cue (underline) a link carries.
      next.underline = true;
      break;
  }
  return Array.from(node.childNodes).flatMap((c) => docxInlineRuns(c, next));
}

async function fetchImageForDocx(src: string): Promise<{ data: ArrayBuffer; type: "jpg" | "png" | "gif" | "bmp" } | null> {
  const ext = src.split(".").pop()?.toLowerCase().split(/[?#]/)[0];
  const type = ext === "jpeg" ? "jpg" : ext === "jpg" || ext === "png" || ext === "gif" || ext === "bmp" ? ext : null;
  if (!type) return null;
  try {
    const res = await fetch(src);
    if (!res.ok) return null;
    const data = await res.arrayBuffer();
    return { data, type };
  } catch {
    return null;
  }
}

function loadImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function docxImageRun(el: HTMLElement): Promise<InstanceType<typeof ImageRun> | null> {
  const src = el.getAttribute("src");
  if (!src) return null;
  const [file, dimensions] = await Promise.all([fetchImageForDocx(src), loadImageDimensions(src)]);
  if (!file) return null;
  const natural = dimensions ?? { width: DOCX_IMAGE_MAX_WIDTH_PX, height: DOCX_IMAGE_MAX_WIDTH_PX };
  const width = Math.min(natural.width, DOCX_IMAGE_MAX_WIDTH_PX);
  const height = Math.round(width * (natural.height / natural.width || 1));
  return new ImageRun({ type: file.type, data: file.data, transformation: { width, height } });
}

function docxTableCell(el: HTMLElement, header: boolean, columnCount: number): InstanceType<typeof TableCell> {
  return new TableCell({
    width: { size: Math.floor(DOCX_TABLE_WIDTH_DXA / columnCount), type: WidthType.DXA },
    shading: header ? { type: ShadingType.CLEAR, fill: "1B2A4A" } : undefined,
    children: [
      new Paragraph({
        children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c, header ? { bold: true } : {})),
      }),
    ],
  });
}

async function docxTable(el: HTMLElement): Promise<InstanceType<typeof Table>> {
  const rowEls = Array.from(el.querySelectorAll("tr"));
  const columnCount = Math.max(1, ...rowEls.map((tr) => tr.children.length));
  const rows = rowEls.map(
    (tr) =>
      new TableRow({
        children: Array.from(tr.children).map((cell) =>
          docxTableCell(cell as HTMLElement, cell.tagName === "TH", columnCount)
        ),
      })
  );
  return new Table({
    width: { size: DOCX_TABLE_WIDTH_DXA, type: WidthType.DXA },
    columnWidths: Array.from({ length: columnCount }, () => Math.floor(DOCX_TABLE_WIDTH_DXA / columnCount)),
    rows,
  });
}

// olInstance lets every <ol> in the page restart its own numbering —
// all share one registered numbering definition (DOCX_OL_NUMBERING_REFERENCE),
// distinguished by `instance`, rather than needing a separate
// definition per list.
async function docxBlock(el: HTMLElement, olInstance: { n: number }): Promise<InstanceType<typeof Paragraph | typeof Table>[]> {
  switch (el.tagName) {
    case "H1":
      return [new Paragraph({ heading: HeadingLevel.HEADING_1, children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c)) })];
    case "H2":
      return [new Paragraph({ heading: HeadingLevel.HEADING_2, children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c)) })];
    case "H3":
      return [new Paragraph({ heading: HeadingLevel.HEADING_3, children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c)) })];
    case "P":
      return [new Paragraph({ spacing: { after: 160 }, children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c)) })];
    case "BLOCKQUOTE":
      return Array.from(el.children).map(
        (child) =>
          new Paragraph({
            indent: { left: 480 },
            border: { left: { style: BorderStyle.SINGLE, size: 12, color: "D9DFE8", space: 8 } },
            children: Array.from(child.childNodes).flatMap((c) => docxInlineRuns(c, { italics: true })),
          })
      );
    case "UL":
      return Array.from(el.children).map(
        (li) => new Paragraph({ bullet: { level: 0 }, children: Array.from(li.childNodes).flatMap((c) => docxInlineRuns(c)) })
      );
    case "OL": {
      olInstance.n += 1;
      const instance = olInstance.n;
      return Array.from(el.children).map(
        (li) =>
          new Paragraph({
            numbering: { reference: DOCX_OL_NUMBERING_REFERENCE, level: 0, instance },
            children: Array.from(li.childNodes).flatMap((c) => docxInlineRuns(c)),
          })
      );
    }
    case "TABLE":
      return [await docxTable(el)];
    case "IMG": {
      const run = await docxImageRun(el);
      return run ? [new Paragraph({ children: [run] })] : [];
    }
    case "HR":
      return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "D9DFE8" } }, children: [] })];
    case "DIV": {
      if (el.hasAttribute("data-checked")) {
        const checked = el.getAttribute("data-checked") === "true";
        return [
          new Paragraph({
            children: [
              new TextRun({ text: checked ? "☑ " : "☐ " }),
              ...Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c, { strike: checked })),
            ],
          }),
        ];
      }
      if (el.hasAttribute("data-card-preset")) {
        const label = el.querySelector("span")?.textContent?.trim() ?? "";
        const bodyEl = el.querySelector("p");
        const shading = { type: ShadingType.CLEAR, fill: "F7F9FB" } as const;
        const paragraphs = [
          new Paragraph({ shading, spacing: { before: 120 }, children: [new TextRun({ text: label, bold: true })] }),
        ];
        if (bodyEl) {
          paragraphs.push(
            new Paragraph({ shading, spacing: { after: 120 }, children: Array.from(bodyEl.childNodes).flatMap((c) => docxInlineRuns(c)) })
          );
        }
        return paragraphs;
      }
      // Unrecognised div (shouldn't occur given the sanitizer's fixed
      // vocabulary) — degrade gracefully rather than drop content.
      const nested: InstanceType<typeof Paragraph | typeof Table>[] = [];
      for (const child of Array.from(el.children)) {
        nested.push(...(await docxBlock(child as HTMLElement, olInstance)));
      }
      return nested;
    }
    default:
      return [new Paragraph({ children: Array.from(el.childNodes).flatMap((c) => docxInlineRuns(c)) })];
  }
}

export async function buildAtlasDocxBlob(title: string, html: string): Promise<Blob> {
  const container = document.createElement("div");
  container.innerHTML = html;
  const olInstance = { n: 0 };
  const children: InstanceType<typeof Paragraph | typeof Table>[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: title })] }),
  ];
  for (const child of Array.from(container.childNodes)) {
    if (child instanceof HTMLElement) {
      children.push(...(await docxBlock(child, olInstance)));
    } else if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim()) {
      children.push(new Paragraph({ children: [new TextRun({ text: child.textContent })] }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: DOCX_OL_NUMBERING_REFERENCE,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: "%1.",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 } } },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export async function downloadWord(title: string, html: string): Promise<void> {
  const blob = await buildAtlasDocxBlob(title, html);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w-]+/g, "-").toLowerCase() || "page"}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
