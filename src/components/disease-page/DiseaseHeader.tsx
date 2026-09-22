"use client";

import { Fragment, type ReactNode } from "react";
import { Star, ShieldCheck } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { EditableText } from "@/components/ui/EditableText";
import { PageHeading, PAGE_HEADING_CLASS } from "@/components/ui/headings";
import { useEditMode, SectionEditToggle } from "@/components/disease-page/EditMode";
import { DeleteDiseaseButton } from "@/components/admin/DeleteDiseaseButton";
import {
  updateDiseaseNameAction,
  toggleEvidenceBasedAction,
  updateBoardRelevanceAction,
  updateDiseasePageTypeAction,
  setTopicOfWeekAction,
  updateTopicOfWeekPitchAction,
} from "@/lib/actions/authoring";
import { toggleDiseaseFavoriteAction } from "@/lib/actions/workspace";
import {
  DISEASE_PAGE_TYPE_ORDER,
  DISEASE_PAGE_TYPE_LABEL,
  PAGE_TYPE_TAG_CLASS,
  isDiseasePageType,
  type DiseasePageType,
} from "@/lib/disease-page-type";

interface DiseaseHeaderProps {
  diseaseId: string;
  diseaseSlug: string;
  diseaseName: string;
  status: string;
  category: string | undefined;
  evidenceBased: boolean;
  boardRelevance: number | null;
  pageType?: DiseasePageType | null;
  isTopicOfWeek?: boolean;
  topicOfWeekPitch?: string | null;
  updatedAt: string;
  readingMinutes: number;
  // From getSectionSummaries — matches "On this page"'s own row count
  // exactly, computed once in page.tsx rather than re-deriving it here.
  // Optional (defaults to 0, hiding the segment) since DiseaseSnapshot
  // also renders this component and doesn't thread a count through.
  sectionCount?: number;
  isSignedIn: boolean;
  isFavorited: boolean;
  // Whether this reader can edit at all (#136 — per-section toggles
  // replaced the single page-wide "Edit page" button; the header gets
  // its own toggle too, treated as its own small edit boundary rather
  // than tying header edits to any one body section).
  canEdit?: boolean;
  // Admin-only, same gate as the /admin review queue's own delete
  // button — an editor can rewrite every word of a page but still
  // can't remove it outright, that's a stricter permission.
  isAdmin?: boolean;
  blockCount?: number;
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
  pageType,
  isTopicOfWeek = false,
  topicOfWeekPitch,
  updatedAt,
  readingMinutes,
  sectionCount = 0,
  isSignedIn,
  isFavorited,
  canEdit = false,
  isAdmin = false,
  blockCount = 0,
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
  if (sectionCount > 0) {
    segments.push(<span>{sectionCount} {sectionCount === 1 ? "section" : "sections"}</span>);
  }
  if (boardRelevance || editing) {
    segments.push(
      <BoardRelevanceStars diseaseId={diseaseId} rating={boardRelevance} editing={editing} />
    );
  }
  if (pageType || editing) {
    segments.push(<PageTypeSelect diseaseId={diseaseId} type={pageType ?? null} editing={editing} />);
  }
  if (isTopicOfWeek || editing) {
    segments.push(<TopicOfWeekToggle diseaseId={diseaseId} enabled={isTopicOfWeek} editing={editing} />);
  }

  return (
    <div className="flex flex-col gap-2">
      {category && <Eyebrow>{category}</Eyebrow>}
      <div className="flex flex-wrap items-center gap-3">
        <PageHeading>
          <EditableText
            as="h1"
            value={diseaseName}
            onSave={(value) => updateDiseaseNameAction(diseaseId, value)}
            multiline={false}
            className={`font-heading ${PAGE_HEADING_CLASS}`}
          />
        </PageHeading>
        {status !== "published" && <ClinicalBadge>Draft — not yet reviewed</ClinicalBadge>}
        {canEdit && <SectionEditToggle />}
        {editing && isAdmin && (
          <DeleteDiseaseButton
            diseaseId={diseaseId}
            canonicalName={diseaseName}
            slug={diseaseSlug}
            status={status}
            blockCount={blockCount}
            redirectTo="/conditions"
          />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3.5 font-ui text-[13.5px] font-semibold text-[#8C97A6]">
        {segments.map((segment, index) => (
          <Fragment key={index}>
            {index > 0 && (
              <span className="text-[#8C97A6]" aria-hidden="true">
                ·
              </span>
            )}
            {segment}
          </Fragment>
        ))}
      </div>
      {isTopicOfWeek && editing && (
        <TopicOfWeekPitchField diseaseId={diseaseId} pitch={topicOfWeekPitch ?? ""} />
      )}
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
      className={`inline-flex items-center gap-1 rounded-[14px] px-[11px] py-[4px] font-ui text-[12px] font-extrabold tracking-[0.4px] uppercase ${
        evidenceBased
          ? "border border-trust/30 bg-trust-bg text-trust"
          : "border border-dashed border-border text-secondary normal-case"
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

// The library home's Browse-by-area type — unset by default (migration
// 0056), never inferred from the title. Not shown to a reader at all
// when unset; while editing, a "—" option is always available so an
// editor can clear it back out.
function PageTypeSelect({
  diseaseId,
  type,
  editing,
}: {
  diseaseId: string;
  type: DiseasePageType | null;
  editing: boolean;
}) {
  if (!editing) {
    return type && <span className={PAGE_TYPE_TAG_CLASS}>{DISEASE_PAGE_TYPE_LABEL[type]}</span>;
  }

  return (
    <select
      value={type ?? ""}
      onChange={(e) => {
        const next = e.target.value;
        updateDiseasePageTypeAction(diseaseId, isDiseasePageType(next) ? next : null);
      }}
      className="rounded border border-border bg-surface px-1.5 py-0.5 font-ui text-xs text-secondary outline-none focus:border-accent"
    >
      <option value="">Page type — unset</option>
      {DISEASE_PAGE_TYPE_ORDER.map((t) => (
        <option key={t} value={t}>
          {DISEASE_PAGE_TYPE_LABEL[t]}
        </option>
      ))}
    </select>
  );
}

// "One feature per page" is enforced server-side (migration 0057's
// partial unique index + setTopicOfWeekAction's own clear-then-set
// transaction) — turning this on here silently turns it off wherever
// else it was on, same as a radio button.
function TopicOfWeekToggle({
  diseaseId,
  enabled,
  editing,
}: {
  diseaseId: string;
  enabled: boolean;
  editing: boolean;
}) {
  if (!editing) {
    return enabled && <span className="font-ui text-xs font-medium text-accent">★ Topic of the week</span>;
  }
  return (
    <button
      type="button"
      onClick={() => setTopicOfWeekAction(diseaseId, !enabled)}
      aria-pressed={enabled}
      className={`font-ui text-xs font-medium ${enabled ? "text-accent" : "text-secondary hover:text-primary"}`}
    >
      {enabled ? "★ Topic of the week" : "☆ Set as topic of the week"}
    </button>
  );
}

// Only rendered while editing and only once the toggle above is on —
// the library home's feature panel is the only place this pitch is
// ever read back, so there's no reader-facing preview needed here.
function TopicOfWeekPitchField({ diseaseId, pitch }: { diseaseId: string; pitch: string }) {
  return (
    <textarea
      defaultValue={pitch}
      onBlur={(e) => updateTopicOfWeekPitchAction(diseaseId, e.target.value)}
      placeholder="Short pitch for the library home feature panel…"
      rows={2}
      className="w-full max-w-lg resize-none rounded border border-border bg-surface px-2 py-1.5 font-ui text-sm text-primary outline-none focus:border-accent"
    />
  );
}
