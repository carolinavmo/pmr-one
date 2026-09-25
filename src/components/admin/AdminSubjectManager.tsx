"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import {
  createSubjectAction,
  renameSubjectAction,
  updateSubjectColorAction,
  reorderSubjectsAction,
  deleteSubjectAction,
} from "@/lib/actions/flashcards-admin";
import type { FlashcardSubjectRow } from "@/lib/flashcards";
import type { CardColor } from "@/lib/editorial-blocks";
import { CARD_COLOR_SWATCH } from "@/lib/card-colors";
import { ColorSwatchPicker } from "@/components/ui/ColorSwatchPicker";
import { Button } from "@/components/ui/Button";

// The "Browse the library" section headers (MSK, Neurology, Basic
// sciences, Other) — a fixed 4-value CHECK constraint before migration
// 0068, now an admin-managed table. Rename is inline (blur to save,
// same idiom TopicSettingsPanel's folder-name field uses); reorder is
// up/down buttons rather than drag-and-drop — there are only ever a
// handful of these, so a full drag implementation buys little. Delete
// is refused server-side (deleteSubjectAction) rather than silently
// reassigning a subject's topics to another one, so the button is
// simply disabled with an explanatory title when that would happen.
export function AdminSubjectManager({ subjects }: { subjects: FlashcardSubjectRow[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<CardColor>("green");
  const [newColorPickerOpen, setNewColorPickerOpen] = useState(false);

  function handleRename(subjectId: string, name: string) {
    startTransition(() => {
      renameSubjectAction(subjectId, name).then(() => router.refresh());
    });
  }

  function handleColor(subjectId: string, color: CardColor) {
    setColorPickerFor(null);
    startTransition(() => {
      updateSubjectColorAction(subjectId, color).then(() => router.refresh());
    });
  }

  function handleMove(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= subjects.length) return;
    const orderedIds = subjects.map((s) => s.id);
    [orderedIds[index], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[index]];
    startTransition(() => {
      reorderSubjectsAction(orderedIds).then(() => router.refresh());
    });
  }

  async function handleDelete(subjectId: string) {
    if (!window.confirm("Delete this subject?")) return;
    const result = await deleteSubjectAction(subjectId);
    if (result.ok) router.refresh();
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await createSubjectAction(newName, newColor);
    setNewOpen(false);
    setNewName("");
    setNewColor("green");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-ui text-sm font-bold text-primary">Subjects</h2>
        <Button type="button" variant="secondary" onClick={() => setNewOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          New subject
        </Button>
      </div>
      <p className="font-ui text-xs text-secondary">The &quot;Browse the library&quot; section headers a topic&apos;s own Settings tab assigns it to.</p>

      {newOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-3">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
              className="w-48 rounded-lg border border-border bg-surface-raised px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="relative flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Color</label>
            <button
              type="button"
              onClick={() => setNewColorPickerOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              <span className={`size-4 rounded-full ${CARD_COLOR_SWATCH[newColor]}`} aria-hidden="true" />
            </button>
            {newColorPickerOpen && (
              <ColorSwatchPicker
                onPick={(c) => {
                  setNewColor(c);
                  setNewColorPickerOpen(false);
                }}
                className="absolute top-full left-0 z-10 mt-1 w-48"
              />
            )}
          </div>
          <Button type="button" variant="primary" onClick={handleCreate} disabled={!newName.trim()}>
            Create
          </Button>
          <Button type="button" variant="ghost" onClick={() => setNewOpen(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {subjects.map((subject, index) => (
          <div key={subject.id} className="flex items-center gap-3 p-3">
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => handleMove(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="text-secondary hover:text-primary disabled:opacity-30"
              >
                <ArrowUp className="size-3.5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => handleMove(index, 1)}
                disabled={index === subjects.length - 1}
                aria-label="Move down"
                className="text-secondary hover:text-primary disabled:opacity-30"
              >
                <ArrowDown className="size-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setColorPickerFor(colorPickerFor === subject.id ? null : subject.id)}
                className={`size-5 shrink-0 rounded-full ${CARD_COLOR_SWATCH[subject.color]}`}
                aria-label="Change color"
              />
              {colorPickerFor === subject.id && (
                <ColorSwatchPicker onPick={(c) => handleColor(subject.id, c)} className="absolute top-full left-0 z-10 mt-1 w-48" />
              )}
            </div>

            <input
              type="text"
              defaultValue={subject.name}
              onBlur={(e) => {
                if (e.target.value.trim() && e.target.value.trim() !== subject.name) handleRename(subject.id, e.target.value);
              }}
              className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-ui text-sm font-medium text-primary outline-none hover:border-border focus:border-accent focus:bg-surface-raised"
            />

            <span className="font-ui text-xs text-secondary">
              {subject.categoryCount} topic{subject.categoryCount === 1 ? "" : "s"}
            </span>

            <button
              type="button"
              onClick={() => handleDelete(subject.id)}
              disabled={subject.categoryCount > 0 || subjects.length <= 1}
              title={subject.categoryCount > 0 ? "Reassign its topics first" : subjects.length <= 1 ? "At least one subject must remain" : "Delete subject"}
              aria-label="Delete subject"
              className="rounded-md p-1.5 text-secondary hover:bg-card-red/10 hover:text-card-red disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-secondary"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
