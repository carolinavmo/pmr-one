"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Plus, X, ChevronUp, ChevronDown } from "lucide-react";
import type { RehabilitationProgressionBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  searchExercisesAction,
  addProtocolExerciseAction,
  removeProtocolExerciseAction,
  moveProtocolExerciseAction,
} from "@/lib/actions/authoring";

// Exercises are separately reusable Knowledge Objects (a stretch could
// appear in several protocols), the same many-to-many shape
// Examination Workflow's maneuvers use — so adding one to the list is
// reuse-first search, not a plain text row like Treatment Algorithm's
// steps. The search-or-create panel lives inline in the block itself
// rather than the top-level "+" picker, since it's adding to an
// already-placed protocol's list, not inserting a new block.
export function RehabilitationProgressionBlockView({
  block,
}: {
  block: RehabilitationProgressionBlock;
}) {
  const { editing } = useEditMode();
  const { protocol } = block;
  const exercises = [...protocol.exercises].sort((a, b) => a.order - b.order);
  const [adding, setAdding] = useState(false);

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        <h3 className="font-reading text-lg text-primary">{protocol.name}</h3>
        <ol className="flex flex-col gap-3">
          {exercises.map((exercise, index) => (
            <li
              key={exercise.id}
              className="flex gap-3 rounded-lg border border-border bg-surface-raised p-3"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
                <Dumbbell className="size-4" aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-ui text-xs text-secondary">Step {index + 1}</span>
                <span className="font-reading text-base text-primary">{exercise.name}</span>
                {exercise.instructions && (
                  <p className="font-ui text-sm text-secondary">{exercise.instructions}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-3">
      <h3 className="font-reading text-lg text-primary">{protocol.name}</h3>
      <ol className="flex flex-col gap-2">
        {exercises.map((exercise, index) => (
          <li
            key={exercise.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface-raised p-3"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-secondary">
              <Dumbbell className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="font-ui text-xs text-secondary">Step {index + 1}</span>
              <span className="font-reading text-base text-primary">{exercise.name}</span>
              {exercise.instructions && (
                <p className="font-ui text-sm text-secondary">{exercise.instructions}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                aria-label="Move exercise up"
                disabled={index === 0}
                onClick={() =>
                  moveProtocolExerciseAction(protocol.id, exercise.id, exercise.order, "up")
                }
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
              >
                <ChevronUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Move exercise down"
                disabled={index === exercises.length - 1}
                onClick={() =>
                  moveProtocolExerciseAction(protocol.id, exercise.id, exercise.order, "down")
                }
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Remove exercise"
                onClick={() => removeProtocolExerciseAction(protocol.id, exercise.id)}
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {adding ? (
        <ExerciseSearchPanel protocolId={protocol.id} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add exercise
        </button>
      )}
    </div>
  );
}

function ExerciseSearchPanel({
  protocolId,
  onDone,
}: {
  protocolId: string;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; instructions: string | null }[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchExercisesAction(query).then((rows) => {
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
  const exactMatch = visibleResults.some((r) => r.name.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface-raised p-2">
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search existing exercises…"
          className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancel"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {loading && <p className="font-ui text-sm text-secondary">Searching…</p>}
      {!loading && visibleResults.length > 0 && (
        <ul className="flex flex-col gap-1">
          {visibleResults.map((result) => (
            <li key={result.id}>
              <button
                type="button"
                onClick={async () => {
                  onDone();
                  await addProtocolExerciseAction(protocolId, { exerciseId: result.id });
                }}
                className="flex w-full flex-col items-start rounded px-2 py-1 text-left hover:bg-border/40"
              >
                <span className="font-ui text-sm text-primary">{result.name}</span>
                {result.instructions && (
                  <span className="font-ui text-xs text-secondary">{result.instructions}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!loading && trimmed && !exactMatch && (
        <div className="flex flex-col gap-1.5 border-t border-border pt-2">
          <input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Instructions for the new exercise (optional)"
            className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={async () => {
              onDone();
              await addProtocolExerciseAction(protocolId, { exerciseName: trimmed, instructions });
            }}
            className="flex w-fit items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5" aria-hidden="true" />
            Create &ldquo;{trimmed}&rdquo;
          </button>
        </div>
      )}
    </div>
  );
}
