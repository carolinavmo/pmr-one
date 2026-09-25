import Anthropic from "@anthropic-ai/sdk";
import { pool } from "@/lib/db";
import { richTextToPlainText } from "@/lib/rich-text";

// "Generate from a library page: pick a page, and the editor proposes
// draft cards from its headings, definitions and pearls. Drafts
// only — a human publishes." (FLASHCARDS-IMPLEMENTATION.md Pass 7)
// Reads directly off editorial_block rather than the full
// disease-loader.ts pipeline (getDiseaseBySlug/resolveBlock) — that
// resolves all 36 block types with their own joins (illustrations,
// algorithms, tables...); this only ever needs five plain-text-bearing
// ones, so a narrow query is simpler than filtering the full tree.
const TEXT_BLOCK_TYPES = ["section_heading", "subsection_heading", "subsubsection_heading", "paragraph", "key_point"];

const MAX_SOURCE_CHARS = 12000;

export async function extractDiseaseTextForCards(diseaseId: string): Promise<{ diseaseName: string; text: string } | null> {
  const { rows: diseaseRows } = await pool.query<{ canonical_name: string }>(`SELECT canonical_name FROM disease WHERE id = $1`, [diseaseId]);
  const diseaseName = diseaseRows[0]?.canonical_name;
  if (!diseaseName) return null;

  const { rows: blockRows } = await pool.query<{ block_type: string; content_config: Record<string, unknown>; referenced_object_id: string | null }>(
    `SELECT block_type, content_config, referenced_object_id
     FROM editorial_block
     WHERE disease_id = $1 AND block_type = ANY($2)
     ORDER BY position`,
    [diseaseId, TEXT_BLOCK_TYPES]
  );

  const { rows: pearlRows } = await pool.query<{ body: string }>(
    `SELECT cpe.body
     FROM editorial_block eb
     JOIN clinical_pearl_editorial cpe ON cpe.id = eb.referenced_object_id
     WHERE eb.disease_id = $1 AND eb.block_type = 'clinical_pearl'
     ORDER BY eb.position`,
    [diseaseId]
  );

  const { rows: selfCheckRows } = await pool.query<{ content_config: { question?: string; answer?: string } }>(
    `SELECT content_config FROM editorial_block WHERE disease_id = $1 AND block_type = 'self_check' ORDER BY position`,
    [diseaseId]
  );

  const lines: string[] = [];
  for (const row of blockRows) {
    const cc = row.content_config ?? {};
    if (row.block_type === "paragraph") {
      const body = typeof cc.body === "string" ? richTextToPlainText(cc.body) : "";
      if (body) lines.push(body);
    } else {
      const text = typeof cc.text === "string" ? cc.text : "";
      if (text) lines.push(row.block_type.includes("heading") ? `## ${text}` : `- ${text}`);
    }
  }
  for (const pearl of pearlRows) {
    const body = richTextToPlainText(pearl.body);
    if (body) lines.push(`Pearl: ${body}`);
  }
  for (const sc of selfCheckRows) {
    const q = sc.content_config?.question;
    const a = sc.content_config?.answer;
    if (q && a) lines.push(`Existing Q&A — Q: ${richTextToPlainText(q)} A: ${richTextToPlainText(a)}`);
  }

  const text = lines.join("\n").slice(0, MAX_SOURCE_CHARS);
  return { diseaseName, text };
}

export interface GeneratedCardDraft {
  question: string;
  answer: string;
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set — card generation needs it configured in the environment.");
  }
  client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

// One plain Messages API call — extraction/summarization from a
// bounded source text is squarely the "single LLM call" tier, no
// agent loop or extended thinking needed. Asks for strict JSON and
// parses defensively (a model response is never trusted input).
export async function generateCardDrafts(diseaseName: string, sourceText: string, count: number): Promise<GeneratedCardDraft[]> {
  if (!sourceText.trim()) return [];

  const prompt = `You are helping a PM&R (Physical Medicine & Rehabilitation) residency program write spaced-repetition flashcards from a clinical reference page.

Page topic: ${diseaseName}

Source content:
${sourceText}

Write ${count} flashcards as retrieval-practice questions a resident could use to test recall of this material. Rules:
- Each question tests ONE discrete fact, distinction, or clinical decision point — never a compound "and" question.
- Answers are concise (1-3 sentences), specific, and self-contained (a reader shouldn't need the source page to make sense of it).
- Prefer "why"/"how do you distinguish"/"what changes management" questions over simple recall of a definition, when the source supports it.
- Do not invent facts not supported by the source content.
- Front and back are plain text — no markdown formatting, no HTML.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"question": "...", "answer": "..."}]`;

  const response = await getClient().messages.create({
    model: "claude-sonnet-5",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") return [];

  let raw = textBlock.text.trim();
  // Models occasionally wrap JSON in a ```json fence despite the
  // instruction not to add other text — strip it rather than fail.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) raw = fenceMatch[1].trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item): item is GeneratedCardDraft => typeof item === "object" && item !== null && typeof (item as GeneratedCardDraft).question === "string" && typeof (item as GeneratedCardDraft).answer === "string")
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question && item.answer);
}
