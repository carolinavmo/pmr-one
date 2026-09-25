"use client";

import { useState, useTransition } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Plus, Copy, Archive, ArchiveRestore } from "lucide-react";
import type { AdminDeckRow } from "@/lib/flashcards-admin";
import type { FlashcardCategory } from "@/lib/flashcards";
import {
  createAdminDeckAction,
  publishAdminDeckAction,
  unpublishAdminDeckAction,
  archiveAdminDeckAction,
  unarchiveAdminDeckAction,
  duplicateAdminDeckAction,
} from "@/lib/actions/flashcards-admin";
import { SUBJECT_ORDER, SUBJECT_LABEL, SUBJECT_COLOR } from "@/lib/flashcard-subjects";
import { Button } from "@/components/ui/Button";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const NEEDS_REVIEW_MONTHS = 12;

// Same threshold as flashcards-admin.ts's own deckNeedsReview — kept
// as a separate copy rather than a shared import because that file
// pulls in `pg` (server-only) and this is a client component.
function needsReview(reviewedAt: string | null): boolean {
  if (!reviewedAt) return true;
  const monthsAgo = (Date.now() - new Date(reviewedAt).getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAgo >= NEEDS_REVIEW_MONTHS;
}

export function AdminFlashcardsDeckList({ decks, categories }: { decks: AdminDeckRow[]; categories: FlashcardCategory[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newDeckOpen, setNewDeckOpen] = useState(false);
  const [newDeckName, setNewDeckName] = useState("");
  const [newDeckCategoryId, setNewDeckCategoryId] = useState<string>("");
  const [needsReviewOnly, setNeedsReviewOnly] = useState(false);

  async function handleCreate() {
    if (!newDeckName.trim()) return;
    const id = await createAdminDeckAction(newDeckName, newDeckCategoryId || null);
    setNewDeckOpen(false);
    setNewDeckName("");
    setNewDeckCategoryId("");
    router.push(`/admin/flashcards/${id}`);
  }

  // Group by subject (the category's own field), then by category
  // within it — an uncategorized deck falls into its own "No topic"
  // bucket under "Other" rather than being dropped.
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const visibleDecks = needsReviewOnly ? decks.filter((d) => d.status === "published" && needsReview(d.reviewedAt)) : decks;
  const bySubject = new Map<string, AdminDeckRow[]>();
  for (const deck of visibleDecks) {
    const category = deck.categoryId ? categoryById.get(deck.categoryId) : null;
    const subject = category?.subject ?? "other";
    const list = bySubject.get(subject);
    if (list) list.push(deck);
    else bySubject.set(subject, [deck]);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 font-ui text-sm text-secondary">
          <input type="checkbox" checked={needsReviewOnly} onChange={(e) => setNeedsReviewOnly(e.target.checked)} className="size-4 rounded border-border" />
          Needs review only
        </label>
        <Button type="button" variant="primary" onClick={() => setNewDeckOpen((v) => !v)}>
          <Plus className="size-4" aria-hidden="true" />
          New deck
        </Button>
      </div>

      {newDeckOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface-raised p-4">
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Deck name</label>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              autoFocus
              className="w-64 rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-ui text-xs font-bold text-secondary">Topic</label>
            <select
              value={newDeckCategoryId}
              onChange={(e) => setNewDeckCategoryId(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 font-ui text-sm text-primary outline-none focus:border-accent"
            >
              <option value="">No topic yet</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" variant="primary" onClick={handleCreate}>
            Create draft
          </Button>
          <Button type="button" variant="ghost" onClick={() => setNewDeckOpen(false)}>
            Cancel
          </Button>
        </div>
      )}

      {visibleDecks.length === 0 && !newDeckOpen && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center font-ui text-sm text-secondary">
          {needsReviewOnly ? "Nothing needs review right now." : "No decks yet — create one to start writing library cards."}
        </p>
      )}

      {SUBJECT_ORDER.filter((s) => bySubject.has(s)).map((subject) => (
        <div key={subject} className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="size-2.5 shrink-0 rounded-[3px]" style={{ backgroundColor: SUBJECT_COLOR[subject] }} />
            <span className="font-ui text-xs font-black tracking-[1.6px] uppercase" style={{ color: SUBJECT_COLOR[subject] }}>
              {SUBJECT_LABEL[subject]}
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border shadow-sm">
            {bySubject.get(subject)!.map((deck) => (
              <DeckRow key={deck.id} deck={deck} startTransition={startTransition} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeckRow({ deck, startTransition }: { deck: AdminDeckRow; startTransition: (fn: () => void) => void }) {
  const router = useRouter();
  const [publishError, setPublishError] = useState<string | null>(null);

  function handlePublish() {
    setPublishError(null);
    startTransition(() => {
      publishAdminDeckAction(deck.id).then((result) => {
        if (!result.ok) setPublishError("Publish a card first — a deck needs at least one published card.");
      });
    });
  }

  async function handleDuplicate() {
    const id = await duplicateAdminDeckAction(deck.id);
    if (id) router.push(`/admin/flashcards/${id}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 bg-surface p-4 hover:bg-surface-raised/60">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Link href={`/admin/flashcards/${deck.id}`} className="font-ui text-sm font-medium text-primary hover:text-accent">
            {deck.name}
          </Link>
          <ClinicalBadge tone={deck.status === "draft" ? "warning" : "neutral"}>{deck.status}</ClinicalBadge>
          {deck.archivedAt && <ClinicalBadge tone="warning">archived</ClinicalBadge>}
          {deck.status === "published" && needsReview(deck.reviewedAt) && <ClinicalBadge tone="warning">needs review</ClinicalBadge>}
        </div>
        <p className="font-ui text-xs text-secondary">
          {deck.categoryName ?? "No topic"} · {deck.publishedCardCount}/{deck.cardCount} cards published
          {deck.sourceDiseaseName && ` · from ${deck.sourceDiseaseName}`}
          {deck.reviewedAt
            ? ` · reviewed ${DATE_FORMAT.format(new Date(deck.reviewedAt))}${deck.reviewedByName ? ` by ${deck.reviewedByName}` : ""}`
            : " · not yet reviewed"}
        </p>
        {publishError && <p className="font-ui text-xs font-semibold text-card-red">{publishError}</p>}
      </div>
      <div className="flex items-center gap-2">
        {deck.status === "published" ? (
          <Button type="button" variant="secondary" onClick={() => startTransition(() => unpublishAdminDeckAction(deck.id))}>
            Unpublish
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={handlePublish}>
            Publish
          </Button>
        )}
        <button
          type="button"
          onClick={handleDuplicate}
          aria-label="Duplicate deck"
          className="rounded-md p-2 text-secondary hover:bg-border/40 hover:text-primary"
        >
          <Copy className="size-4" aria-hidden="true" />
        </button>
        {deck.archivedAt ? (
          <button
            type="button"
            onClick={() => startTransition(() => unarchiveAdminDeckAction(deck.id))}
            aria-label="Unarchive deck"
            className="rounded-md p-2 text-secondary hover:bg-border/40 hover:text-primary"
          >
            <ArchiveRestore className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTransition(() => archiveAdminDeckAction(deck.id))}
            aria-label="Archive deck"
            className="rounded-md p-2 text-secondary hover:bg-border/40 hover:text-card-red"
          >
            <Archive className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
