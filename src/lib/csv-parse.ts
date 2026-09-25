// A small hand-rolled RFC4180-ish parser — no dependency pulled in for
// what's a bounded, well-understood format (front, back, optional
// tags), and it needs to handle both comma- and tab-separated paste
// (a spreadsheet's default copy is TSV, a plain .csv export is comma).
// Delimiter is auto-detected from the header line: more tabs than
// commas means TSV.
export interface ParsedCsvRow {
  cells: string[];
  raw: string;
}

function detectDelimiter(firstLine: string): string {
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  const commas = (firstLine.match(/,/g) ?? []).length;
  return tabs > commas ? "\t" : ",";
}

function parseLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

// Handles a quoted field containing an embedded newline by joining
// continuation lines back together before splitting into cells —
// a plain line-by-line split would otherwise cut a multi-line answer
// in half.
export function parseDelimitedText(text: string): ParsedCsvRow[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const firstLine = trimmed.split("\n")[0];
  const delimiter = detectDelimiter(firstLine);

  const lines = trimmed.split("\n");
  const logicalLines: string[] = [];
  let buffer = "";
  for (const line of lines) {
    buffer = buffer ? `${buffer}\n${line}` : line;
    const quoteCount = (buffer.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 0) {
      logicalLines.push(buffer);
      buffer = "";
    }
  }
  if (buffer) logicalLines.push(buffer);

  return logicalLines.filter((l) => l.trim().length > 0).map((line) => ({ cells: parseLine(line, delimiter).map((c) => c.trim()), raw: line }));
}

export interface CardImportRow {
  question: string;
  answer: string;
  tags: string;
}

// front, back, optional tags — a header row is detected and skipped
// when its first cell looks like a label rather than real content
// ("front"/"question" etc., case-insensitive). Tags are parsed and
// shown in the preview but not persisted — there's no tag column on
// `flashcard` yet, and adding one is its own feature; a future import
// re-run against the same file loses nothing once that lands.
export function parseCardImport(text: string): CardImportRow[] {
  const rows = parseDelimitedText(text);
  if (rows.length === 0) return [];

  const first = rows[0].cells[0]?.toLowerCase().trim() ?? "";
  const looksLikeHeader = ["front", "question", "q"].includes(first);
  const dataRows = looksLikeHeader ? rows.slice(1) : rows;

  return dataRows
    .filter((r) => r.cells[0]?.trim())
    .map((r) => ({
      question: r.cells[0]?.trim() ?? "",
      answer: r.cells[1]?.trim() ?? "",
      tags: r.cells[2]?.trim() ?? "",
    }));
}
