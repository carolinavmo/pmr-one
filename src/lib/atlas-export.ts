"use client";

// HANDBOOK-SPEC.md Pass 6 — "Export a page to PDF and Markdown,
// preserving headings, tasks, tables and cards." Both run entirely
// client-side against the note's already-rendered HTML:
// - Markdown: a small hand-written HTML→MD converter, since the
//   editor's whole tag vocabulary is fixed and known (rich-text.ts's
//   ALLOWED_TAGS) — not worth a general-purpose HTML-to-Markdown
//   dependency for ~15 element types.
// - PDF: the browser's own print-to-PDF (a new window with a
//   print-only stylesheet, then window.print()) rather than a new
//   server-side PDF-rendering dependency — "Save as PDF" from the
//   system print dialog is what actually runs, not a server-generated
//   file.

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
