"use client";

import { useState, useTransition } from "react";
import { Trash2, TriangleAlert } from "lucide-react";
import { deleteDiseaseAction } from "@/app/[locale]/admin/actions";
import { useRouter } from "@/i18n/navigation";

// A confirmation modal, not a single click — this is the exact
// operation that once destroyed a disease's content via a one-off
// script with no backup and no undo. Requires typing the disease's
// own slug before the button enables, mirroring the GitHub
// delete-repo pattern; the server action re-checks the same slug and
// takes a database backup before touching anything, so this dialog is
// a UX gate, not the only safeguard.
export function DeleteDiseaseButton({
  diseaseId,
  canonicalName,
  slug,
  status,
  blockCount,
  // Set when this button lives on the disease page itself, not the
  // /admin review queue — deleting the page you're currently viewing
  // leaves you on a route that no longer exists, so success navigates
  // away instead of just closing the dialog (the queue doesn't need
  // this: it's a list page that already re-renders itself).
  redirectTo,
}: {
  diseaseId: string;
  canonicalName: string;
  slug: string;
  status: string;
  blockCount: number;
  redirectTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function close() {
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteDiseaseAction(diseaseId, confirmText);
      if (result.ok) {
        if (redirectTo) {
          router.push(redirectTo);
        } else {
          close();
        }
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${canonicalName}`}
        className="flex size-9 items-center justify-center rounded-full text-secondary hover:bg-warning/10 hover:text-warning"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={close}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-disease-title"
            className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border bg-surface-raised p-6 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
                <TriangleAlert className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="delete-disease-title" className="font-reading text-lg text-primary">
                  Delete {canonicalName}?
                </h2>
                <p className="mt-1 font-ui text-sm text-secondary">
                  This permanently deletes the disease page and all {blockCount} editorial
                  block{blockCount === 1 ? "" : "s"}. Its Knowledge Graph objects (risk factors,
                  exam maneuvers, algorithms, etc.) are shared and stay intact for other diseases.
                  {status === "published" && (
                    <span className="mt-1 block font-medium text-warning">
                      This page is currently live and visible to readers.
                    </span>
                  )}
                </p>
              </div>
            </div>

            <p className="font-ui text-xs text-secondary">
              A database backup is taken automatically before deleting — the delete is cancelled
              if the backup fails — but this cannot be undone from within the app afterward.
            </p>

            <label className="flex flex-col gap-1.5">
              <span className="font-ui text-xs text-secondary">
                Type <span className="font-mono font-medium text-primary">{slug}</span> to confirm
              </span>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoFocus
                className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm text-primary outline-none focus:border-accent"
              />
            </label>

            {error && <p className="font-ui text-sm text-warning">{error}</p>}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="inline-flex min-h-10 items-center justify-center rounded-full border border-border bg-surface-raised px-4 font-ui text-sm font-medium text-primary hover:bg-border/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={confirmText !== slug || isPending}
                className="inline-flex min-h-10 items-center justify-center rounded-full bg-warning px-4 font-ui text-sm font-medium text-white hover:bg-warning/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isPending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
