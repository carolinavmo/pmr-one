"use client";

import { Fragment, type ReactNode } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { EditableText } from "@/components/ui/EditableText";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";
import {
  updateDiseaseNameAction,
  toggleEvidenceBasedAction,
  updateBoardRelevanceAction,
} from "@/lib/actions/authoring";
import { toggleDiseaseFavoriteAction } from "@/lib/actions/workspace";

interface DiseaseHeaderProps {
  diseaseId: string;
  diseaseSlug: string;
  diseaseName: string;
  status: string;
  category: string | undefined;
  evidenceBased: boolean;
  boardRelevance: number | null;
  updatedAt: string;
  readingMinutes: number;
  isSignedIn: boolean;
  isFavorited: boolean;
  // Whether this reader can edit at all (#136 — per-section toggles
  // replaced the single page-wide "Edit page" button; the header gets
  // its own toggle too, treated as its own small edit boundary rather
  // than tying header edits to any one body section).
  canEdit?: boolean;
}

const MONTH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

// Single source for the disease-page title block — used both by the
// Clinical Snapshot arrival shape (DiseaseSnapshot) and the plain
// fallback header, so the two paths never drift out of sync with each
// other again the way the old ad hoc h1-plus-badge markup in each did.
export function DiseaseHeader({
  diseaseId,
  diseaseSlug,
  diseaseName,
  status,
  category,
  evidenceBased,
  boardRelevance,
  updatedAt,
  readingMinutes,
  isSignedIn,
  isFavorited,
  canEdit = false,
}: DiseaseHeaderProps) {
  const { editing } = useEditMode();

  // Evidence-Based and Board Relevance only take up a meta-row slot
  // when they have something to show a visitor — except while
  // editing, where they always show (even at their "unset" value) so
  // an editor has something to click to set them in the first place.
  const segments: ReactNode[] = [];
  if (isSignedIn) {
    segments.push(
      <FavoriteToggle diseaseId={diseaseId} diseaseSlug={diseaseSlug} isFavorited={isFavorited} />
    );
  }
  if (evidenceBased || editing) {
    segments.push(
      <EvidenceBadge diseaseId={diseaseId} evidenceBased={evidenceBased} editing={editing} />
    );
  }
  segments.push(<span>Updated {MONTH_YEAR.format(new Date(updatedAt))}</span>);
  segments.push(<span>Reading time: {readingMinutes} min</span>);
  if (boardRelevance || editing) {
    segments.push(
      <BoardRelevanceStars diseaseId={diseaseId} rating={boardRelevance} editing={editing} />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {category && <Eyebrow>{category}</Eyebrow>}
      <div className="flex flex-wrap items-center gap-3">
        <EditableText
          as="h1"
          value={diseaseName}
          onSave={(value) => updateDiseaseNameAction(diseaseId, value)}
          multiline={false}
          // H1 per PM&R Atlas Design System doc: Poppins SemiBold,
          // 40px/48px, -0.5px tracking.
          className="font-heading text-[40px] leading-[48px] tracking-[-0.5px] font-semibold text-primary"
        />
        {status !== "published" && <ClinicalBadge>Draft — not yet reviewed</ClinicalBadge>}
        {canEdit && <SectionEditToggle />}
      </div>
      <div className="flex flex-wrap items-center gap-2 font-ui text-sm text-secondary">
        {segments.map((segment, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <span className="text-border" aria-hidden="true">
                ·
              </span>
            )}
            {segment}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function FavoriteToggle({
  diseaseId,
  diseaseSlug,
  isFavorited,
}: {
  diseaseId: string;
  diseaseSlug: string;
  isFavorited: boolean;
}) {
  return (
    <form action={toggleDiseaseFavoriteAction} className="contents">
      <input type="hidden" name="diseaseId" value={diseaseId} />
      <input type="hidden" name="diseaseSlug" value={diseaseSlug} />
      <button
        type="submit"
        aria-pressed={isFavorited}
        aria-label={isFavorited ? "Remove from Favourites" : "Add to Favourites"}
        className={`flex items-center gap-1 ${
          isFavorited ? "text-accent" : "text-secondary hover:text-primary"
        }`}
      >
        <Star className="size-3.5" fill={isFavorited ? "currentColor" : "none"} aria-hidden="true" />
        Favourite
      </button>
    </form>
  );
}

function EvidenceBadge({
  diseaseId,
  evidenceBased,
  editing,
}: {
  diseaseId: string;
  evidenceBased: boolean;
  editing: boolean;
}) {
  const pill = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-ui text-xs font-medium ${
        evidenceBased
          ? "bg-accent/10 text-accent"
          : "border border-dashed border-border text-secondary"
      }`}
    >
      <ShieldCheck className="size-3.5" aria-hidden="true" />
      Evidence-Based
    </span>
  );

  if (!editing) return pill;

  return (
    <button
      type="button"
      onClick={() => toggleEvidenceBasedAction(diseaseId)}
      aria-pressed={evidenceBased}
    >
      {pill}
    </button>
  );
}

function BoardRelevanceStars({
  diseaseId,
  rating,
  editing,
}: {
  diseaseId: string;
  rating: number | null;
  editing: boolean;
}) {
  const value = rating ?? 0;

  return (
    <span className="flex items-center gap-1">
      <span>Board relevance</span>
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) =>
          editing ? (
            <button
              key={n}
              type="button"
              aria-label={`Set board relevance to ${n}`}
              onClick={() => updateBoardRelevanceAction(diseaseId, n)}
            >
              <Star
                className={`size-3.5 ${n <= value ? "text-accent" : "text-border"}`}
                fill={n <= value ? "currentColor" : "none"}
                aria-hidden="true"
              />
            </button>
          ) : (
            <Star
              key={n}
              className={`size-3.5 ${n <= value ? "text-accent" : "text-border"}`}
              fill={n <= value ? "currentColor" : "none"}
              aria-hidden="true"
            />
          )
        )}
      </span>
    </span>
  );
}
