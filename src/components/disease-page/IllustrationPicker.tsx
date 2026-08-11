"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { searchMedicalIllustrationsAction } from "@/lib/actions/authoring";

// Shared by the "+" picker's insert flow and an existing illustration
// block's "Replace" flow — search-and-reuse plus upload, in one place,
// so the two surfaces can't drift into different behavior. Upload
// always creates a new medical_illustration row (never mutates an
// existing one), so neither caller has to think about who else might
// be using the illustration they're replacing/inserting.
export function IllustrationPicker({
  onSelectExisting,
  onUploadNew,
  onBack,
  searchPlaceholder = "Search existing illustrations…",
}: {
  onSelectExisting: (illustrationId: string) => void;
  onUploadNew: (formData: FormData) => Promise<void>;
  onBack: () => void;
  searchPlaceholder?: string;
}) {
  const [tab, setTab] = useState<"search" | "upload">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { id: string; title: string; assetUrl: string; usageCount: number }[]
  >([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [altText, setAltText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchMedicalIllustrationsAction(query).then((rows) => {
      if (!cancelled) {
        setResults(rows);
        setResolvedQuery(query);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const trimmed = query.trim();
  const loading = trimmed !== "" && resolvedQuery !== query;
  const visibleResults = trimmed ? results : [];

  return (
    <div className="w-80 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-1 border-b border-border px-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 p-1 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`rounded-t px-3 py-1.5 font-ui text-sm ${
            tab === "search"
              ? "border-b-2 border-accent text-primary"
              : "text-secondary hover:text-primary"
          }`}
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setTab("upload")}
          className={`rounded-t px-3 py-1.5 font-ui text-sm ${
            tab === "upload"
              ? "border-b-2 border-accent text-primary"
              : "text-secondary hover:text-primary"
          }`}
        >
          Upload
        </button>
      </div>

      {tab === "search" ? (
        <>
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
            {!loading &&
              visibleResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => onSelectExisting(result.id)}
                  className="flex w-full items-center gap-2.5 rounded px-2 py-1.5 text-left hover:bg-border/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary asset URL. */}
                  <img
                    src={result.assetUrl}
                    alt=""
                    className="size-10 shrink-0 rounded border border-border object-cover"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-ui text-sm text-primary">{result.title}</span>
                    {result.usageCount > 0 && (
                      <span className="font-ui text-xs text-secondary">
                        Used on {result.usageCount} {result.usageCount === 1 ? "page" : "pages"}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            {!loading && trimmed && visibleResults.length === 0 && (
              <p className="px-3 py-3 font-ui text-sm text-secondary">
                No illustrations match &ldquo;{trimmed}&rdquo;. Try Upload instead.
              </p>
            )}
            {!loading && !trimmed && (
              <p className="px-3 py-3 font-ui text-sm text-secondary">
                Start typing to search existing illustrations.
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1.5 rounded border border-dashed border-border py-4 text-secondary hover:border-accent hover:text-accent"
          >
            <Upload className="size-5" aria-hidden="true" />
            <span className="font-ui text-sm">
              {file ? file.name : "Choose an image"}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">
              Alt text (for screen readers)
            </span>
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            disabled={!file || !title.trim() || !altText.trim() || uploading}
            onClick={async () => {
              const formData = new FormData();
              formData.set("file", file as File);
              formData.set("title", title.trim());
              formData.set("altText", altText.trim());
              setUploading(true);
              setUploadError(null);
              try {
                await onUploadNew(formData);
              } catch {
                setUploadError("Upload failed. Try again.");
                setUploading(false);
              }
            }}
            className="rounded bg-accent px-3 py-1.5 font-ui text-sm text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
          {uploadError && <span className="font-ui text-xs text-warning">{uploadError}</span>}
        </div>
      )}
    </div>
  );
}
