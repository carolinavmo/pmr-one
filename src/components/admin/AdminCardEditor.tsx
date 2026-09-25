"use client";

import { useState } from "react";
import { AlertTriangle, Trash2, Copy, ChevronUp } from "lucide-react";
import type { AdminCardRow } from "@/lib/flashcards-admin";
import {
  updateAdminCardAction,
  publishAdminCardAction,
  unpublishAdminCardAction,
  softDeleteAdminCardAction,
  duplicateAdminCardAction,
  getCardBlastRadiusAction,
  flagCardAnswerChangedAction,
} from "@/lib/actions/flashcards-admin";
import { sanitizeRichText } from "@/lib/rich-text";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const UPDATED_CHIP_DAYS = 14;

function isRecentlyUpdated(contentUpdatedAt: string | null): boolean {
  if (!contentUpdatedAt) return false;
  return Date.now() - new Date(contentUpdatedAt).getTime() < UPDATED_CHIP_DAYS * 24 * 60 * 60 * 1000;
}

// The expanded editor for one card — "front and back as the same rich
// editor used in My Handbook... a live preview in the study screen's
// own styling" (FLASHCARDS-IMPLEMENTATION.md Pass 5), plus the
// separate, deliberate "this changes the answer" action Pass 6 calls
// out as "the part that goes wrong quietly": typing and formatting
// autosave per field on blur (routine, never touches anyone's
// scheduling); this reset is its own explicit step with the blast
// radius shown before it commits.
export function AdminCardEditor({
  card,
  onChange,
  onDeleted,
  onDuplicated,
  onClose,
}: {
  card: AdminCardRow;
  onChange: (card: AdminCardRow) => void;
  onDeleted: () => void;
  onDuplicated: (newCardId: string) => void;
  onClose: () => void;
}) {
  const [question, setQuestion] = useState(card.question);
  const [answer, setAnswer] = useState(card.answer);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [blastRadius, setBlastRadius] = useState<number | null>(null);
  const [loadingBlastRadius, setLoadingBlastRadius] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  async function saveField(field: "question" | "answer", html: string) {
    const next = field === "question" ? { question: html, answer } : { question, answer: html };
    if (field === "question") setQuestion(html);
    else setAnswer(html);
    await updateAdminCardAction(card.id, next);
    onChange({ ...card, question: next.question, answer: next.answer, contentVersion: card.contentVersion + 1 });
  }

  async function loadBlastRadius() {
    setLoadingBlastRadius(true);
    const count = await getCardBlastRadiusAction(card.id);
    setBlastRadius(count);
    setLoadingBlastRadius(false);
  }

  async function confirmAnswerChanged() {
    const result = await flagCardAnswerChangedAction(card.id);
    setResetMessage(result.resetCount > 0 ? `Reset ${result.resetCount} reader${result.resetCount === 1 ? "" : "s"} to learning.` : "Saved — no one was in review yet.");
    setBlastRadius(null);
    onChange({ ...card, contentVersion: card.contentVersion + 1, contentUpdatedAt: new Date().toISOString() });
  }

  return (
    <div className="flex flex-col gap-4 border-t border-border bg-surface-raised/40 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClinicalBadge tone={card.status === "draft" ? "warning" : "neutral"}>{card.status}</ClinicalBadge>
          {isRecentlyUpdated(card.contentUpdatedAt) && <ClinicalBadge tone="warning">UPDATED</ClinicalBadge>}
          <span className="font-ui text-xs text-secondary">v{card.contentVersion}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Collapse" className="rounded-md p-1.5 text-secondary hover:bg-border/40">
          <ChevronUp className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block font-ui text-xs font-bold text-secondary">Front</label>
            <RichEditableText
              as="div"
              value={question}
              onChange={setQuestion}
              onSave={(html) => saveField("question", html)}
              placeholder="Question"
              compact
              autoEdit
              className="min-h-[80px] rounded-lg border border-border bg-surface px-3 py-2 font-reading text-base text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block font-ui text-xs font-bold text-secondary">Back</label>
            <RichEditableText
              as="div"
              value={answer}
              onChange={setAnswer}
              onSave={(html) => saveField("answer", html)}
              placeholder="Answer"
              compact
              autoEdit
              className="min-h-[120px] rounded-lg border border-border bg-surface px-3 py-2 font-reading text-base text-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
          <span className="font-ui text-[10px] font-black tracking-wide text-secondary uppercase">Study screen preview</span>
          <div className="rounded-lg border border-border bg-surface-raised p-4">
            <div className="font-heading text-lg font-black text-navy" dangerouslySetInnerHTML={{ __html: sanitizeRichText(question) || "<p>—</p>" }} />
            <div className="mt-3 border-t border-border pt-3 font-reading text-sm text-primary" dangerouslySetInnerHTML={{ __html: sanitizeRichText(answer) || "<p>—</p>" }} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          {card.status === "published" ? (
            <Button type="button" variant="secondary" onClick={() => unpublishAdminCardAction(card.id).then(() => onChange({ ...card, status: "draft" }))}>
              Unpublish
            </Button>
          ) : (
            <Button type="button" variant="primary" onClick={() => publishAdminCardAction(card.id).then(() => onChange({ ...card, status: "published" }))}>
              Publish
            </Button>
          )}
          <button
            type="button"
            onClick={async () => {
              const id = await duplicateAdminCardAction(card.id);
              if (id) onDuplicated(id);
            }}
            aria-label="Duplicate card"
            className="rounded-md p-2 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <Copy className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete card"
            className="rounded-md p-2 text-secondary hover:bg-border/40 hover:text-card-red"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          {blastRadius === null ? (
            <button
              type="button"
              onClick={loadBlastRadius}
              disabled={loadingBlastRadius}
              className="flex items-center gap-1.5 font-ui text-xs font-bold text-secondary hover:text-primary disabled:opacity-50"
            >
              <AlertTriangle className="size-3.5" aria-hidden="true" />
              This changes the answer…
            </button>
          ) : blastRadius === 0 ? (
            <div className="flex items-center gap-2">
              <span className="font-ui text-xs text-secondary">No one has this card in review yet.</span>
              <Button type="button" variant="secondary" onClick={confirmAnswerChanged}>
                Mark as changed
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="font-ui text-xs font-semibold text-card-red">
                {blastRadius} {blastRadius === 1 ? "person has" : "people have"} this card in review — they&apos;ll reset to learning.
              </span>
              <Button type="button" variant="secondary" onClick={confirmAnswerChanged}>
                Reset their progress
              </Button>
            </div>
          )}
          {resetMessage && <span className="font-ui text-xs text-secondary">{resetMessage}</span>}
        </div>
      </div>

      {deleteOpen && (
        <ConfirmDialog
          title="Delete this card? Readers who studied it keep their history, but it disappears from the deck."
          confirmLabel="Delete card"
          cancelLabel="Cancel"
          onConfirm={() => {
            setDeleteOpen(false);
            softDeleteAdminCardAction(card.id).then(onDeleted);
          }}
          onCancel={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
