"use client";

import { TriangleAlert } from "lucide-react";

// Shared confirmation modal — replaces window.confirm() wherever a
// destructive action needs a yes/no gate, so the prompt matches the
// app's own chrome instead of the browser's native alert style. Same
// visual language DeleteTaskButton.tsx and DeleteDiseaseButton.tsx
// already used before this existed; those keep their own local markup
// since they're mid-refactor risk not worth taking here, but any new
// confirm dialog should reach for this instead of re-inlining it.
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
            <TriangleAlert className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="confirm-dialog-title" className="font-reading text-lg text-primary">
              {title}
            </h2>
            {body && <p className="mt-1 font-ui text-sm text-secondary">{body}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface-raised px-4 font-ui text-sm font-medium text-primary hover:bg-border/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-warning px-4 font-ui text-sm font-medium text-white hover:bg-warning/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
