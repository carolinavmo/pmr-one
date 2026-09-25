"use client";

import { useEffect, useState } from "react";
import { Sparkles, Upload, X } from "lucide-react";
import type { DiseaseCatalogEntry } from "@/lib/disease-catalog";
import {
  getPublishedDiseasesForPickerAction,
  generateCardsFromDiseaseAction,
  previewCardImportAction,
  bulkImportCardsAction,
  type ImportPreviewRow,
} from "@/lib/actions/flashcards-admin";
import { Button } from "@/components/ui/Button";

// Pass 7's two "authoring tools that save hours" that create cards in
// bulk: generating drafts from a library page (Claude reads the page,
// proposes questions — "drafts only, a human publishes") and pasting
// a spreadsheet export. Both land as ordinary draft cards through the
// same insert path a hand-typed card uses — no separate "AI-generated"
// state to track or explain later. Neither action returns the new
// rows themselves (just a count), so both call back up to have the
// parent re-fetch rather than trying to splice unknown rows into
// local state.
export function AdminCardTools({ deckId, onCardsCreated }: { deckId: string; onCardsCreated: () => void }) {
  const [open, setOpen] = useState<"generate" | "import" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(open === "generate" ? null : "generate")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Sparkles className="size-4" aria-hidden="true" />
          Generate from a library page
        </button>
        <button
          type="button"
          onClick={() => setOpen(open === "import" ? null : "import")}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 font-ui text-sm text-secondary hover:border-accent/40 hover:text-accent"
        >
          <Upload className="size-4" aria-hidden="true" />
          Import cards
        </button>
      </div>

      {open === "generate" && <GeneratePanel deckId={deckId} onClose={() => setOpen(null)} onCardsCreated={onCardsCreated} />}
      {open === "import" && <ImportPanel deckId={deckId} onClose={() => setOpen(null)} onCardsCreated={onCardsCreated} />}
    </div>
  );
}

function GeneratePanel({ deckId, onClose, onCardsCreated }: { deckId: string; onClose: () => void; onCardsCreated: () => void }) {
  const [diseases, setDiseases] = useState<DiseaseCatalogEntry[] | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DiseaseCatalogEntry | null>(null);
  const [count, setCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    getPublishedDiseasesForPickerAction().then(setDiseases);
  }, []);

  const filtered = (diseases ?? []).filter((d) => d.canonicalName.toLowerCase().includes(query.toLowerCase())).slice(0, 8);

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    const res = await generateCardsFromDiseaseAction(deckId, selected.id, count);
    setGenerating(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.created === 0) {
      setError("No cards were generated — the page may have too little text content to work from.");
      return;
    }
    setResult(`Added ${res.created} draft card${res.created === 1 ? "" : "s"} from ${res.diseaseName}.`);
    onCardsCreated();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs font-bold text-secondary uppercase">Generate from a library page</span>
        <button type="button" onClick={onClose} aria-label="Close" className="text-secondary hover:text-primary">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {selected ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
          <span className="font-ui text-sm text-primary">{selected.canonicalName}</span>
          <button type="button" onClick={() => setSelected(null)} className="font-ui text-xs font-bold text-secondary hover:text-primary">
            Change
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search published pages…"
            autoFocus
            className="rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          {query && (
            <div className="flex flex-col divide-y divide-border rounded-lg border border-border bg-surface">
              {filtered.length === 0 ? (
                <p className="p-3 font-ui text-xs text-secondary">No matches.</p>
              ) : (
                filtered.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelected(d);
                      setQuery("");
                    }}
                    className="p-2.5 text-left font-ui text-sm text-primary hover:bg-border/30"
                  >
                    {d.canonicalName}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <label className="font-ui text-xs font-bold text-secondary">How many cards</label>
        <input
          type="number"
          min={1}
          max={20}
          value={count}
          onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary outline-none focus:border-accent"
        />
      </div>

      {error && <p className="font-ui text-xs font-semibold text-card-red">{error}</p>}
      {result && <p className="font-ui text-xs font-semibold text-secondary">{result}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button type="button" variant="primary" onClick={handleGenerate} disabled={!selected || generating}>
          {generating ? "Generating…" : "Generate drafts"}
        </Button>
      </div>
    </div>
  );
}

function ImportPanel({ deckId, onClose, onCardsCreated }: { deckId: string; onClose: () => void; onCardsCreated: () => void }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<ImportPreviewRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handlePreview() {
    const rows = await previewCardImportAction(text);
    setPreview(rows);
  }

  async function handleImport() {
    if (!preview || preview.length === 0) return;
    setImporting(true);
    const created = await bulkImportCardsAction(deckId, preview);
    setImporting(false);
    setResult(`Added ${created} draft card${created === 1 ? "" : "s"}.`);
    setPreview(null);
    setText("");
    onCardsCreated();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="font-ui text-xs font-bold text-secondary uppercase">Import cards (CSV/TSV)</span>
        <button type="button" onClick={onClose} aria-label="Close" className="text-secondary hover:text-primary">
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <p className="font-ui text-xs text-secondary">Paste rows copied from a spreadsheet: front, back, and an optional tags column (tags aren&apos;t stored yet — they&apos;re shown for review only).</p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setPreview(null);
        }}
        rows={5}
        placeholder={"Front\tBack\nWhat is...?\tIt is..."}
        className="rounded-lg border border-border bg-surface px-3 py-2 font-ui text-xs text-primary outline-none focus:border-accent"
      />

      {!preview && (
        <div className="flex justify-end">
          <Button type="button" variant="secondary" onClick={handlePreview} disabled={!text.trim()}>
            Preview
          </Button>
        </div>
      )}

      {preview && (
        <div className="flex flex-col gap-2">
          <p className="font-ui text-xs font-bold text-secondary">{preview.length} row{preview.length === 1 ? "" : "s"} parsed</p>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-left font-ui text-xs">
              <thead className="bg-surface-sunken">
                <tr>
                  <th className="p-2 font-bold text-secondary">Front</th>
                  <th className="p-2 font-bold text-secondary">Back</th>
                  {preview.some((r) => r.tags) && <th className="p-2 font-bold text-secondary">Tags</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 text-primary">{row.question}</td>
                    <td className="p-2 text-primary">{row.answer}</td>
                    {preview.some((r) => r.tags) && <td className="p-2 text-secondary">{row.tags}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
              Back
            </Button>
            <Button type="button" variant="primary" onClick={handleImport} disabled={importing}>
              {importing ? "Importing…" : `Import ${preview.length} card${preview.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      )}

      {result && <p className="font-ui text-xs font-semibold text-secondary">{result}</p>}
    </div>
  );
}
