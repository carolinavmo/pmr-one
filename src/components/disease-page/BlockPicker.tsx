"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Plus, ArrowLeft } from "lucide-react";
import {
  BLOCK_REGISTRY,
  BLOCK_GROUPS,
  suggestedBlockTypes,
  type BlockRegistryEntry,
} from "@/lib/block-registry";
import {
  insertBlockAction,
  searchRiskFactorsAction,
  insertRiskFactorBlockAction,
  searchClinicalPearlsAction,
  insertClinicalPearlBlockAction,
  searchExaminationManeuversAction,
  insertExaminationManeuverAction,
  searchImagingFindingsAction,
  insertImagingFindingAction,
  searchReferencesAction,
  insertReferenceAction,
  insertCitationCardAction,
  insertMedicalIllustrationBlockAction,
  uploadIllustrationAction,
  searchTreatmentAlgorithmsAction,
  insertTreatmentAlgorithmBlockAction,
  searchRehabilitationProtocolsAction,
  insertRehabilitationProtocolBlockAction,
  insertCardGridBlockAction,
} from "@/lib/actions/authoring";
import { IllustrationPicker } from "@/components/disease-page/IllustrationPicker";
import { notifySectionIndexChanged } from "@/lib/section-events";
import type { ManeuverRelationship } from "@/lib/editorial-blocks";
import { maneuverRelationshipLabel } from "@/lib/editorial-blocks";
import { relationshipGlyph } from "@/lib/relationship-glyphs";

// Large Cards (2-up, big) / Card Grid (3-up, medium) / Small Cards
// (4-up, compact) are the same mechanism at three preset sizes — not
// three different features. Two-column layout (still "future" in the
// registry) would just be a fourth preset of this same table, once
// named with enough confidence to build.
const CARD_GRID_PRESETS = {
  large_cards: { count: 2, width: "1/2" as const },
  card_grid: { count: 3, width: "1/3" as const },
  small_cards: { count: 4, width: "1/4" as const },
};

// The "+" picker exposes the real Editorial Block System — every row
// here is a real block type, grouped by purpose rather than
// alphabetically, not a generic "add text / add image" CMS tray
// (AUTHORING_EXPERIENCE.md, "Adding a block"). Search-first with
// grouped browse as the fallback is what keeps this legible as the
// registry grows toward 30-40 types; a flat list wouldn't.
export function BlockPicker({
  diseaseId,
  afterPosition,
  contextHint,
  onClose,
}: {
  diseaseId: string;
  afterPosition: number;
  contextHint?: string;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  // Non-null once a references-object type is chosen — swaps the
  // whole picker into that type's search-before-create sub-panel.
  const [objectSearch, setObjectSearch] = useState<{ type: string; query: string } | null>(null);

  const suggested = useMemo(() => suggestedBlockTypes(contextHint), [contextHint]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return BLOCK_REGISTRY.filter((entry) => entry.label.toLowerCase().includes(q));
  }, [query]);

  async function handleSelect(entry: BlockRegistryEntry) {
    if (entry.status !== "available") return;
    if (entry.type in CARD_GRID_PRESETS) {
      onClose();
      const preset = CARD_GRID_PRESETS[entry.type as keyof typeof CARD_GRID_PRESETS];
      await insertCardGridBlockAction(diseaseId, afterPosition, preset.count, preset.width);
      return;
    }
    if (entry.kind === "owns-content") {
      onClose();
      await insertBlockAction(
        diseaseId,
        afterPosition,
        entry.type as
          | "paragraph"
          | "section_heading"
          | "key_point"
          | "warning_pitfall"
          | "learning_objective"
          | "timeline"
          | "infographic"
          | "comparison_table"
          | "self_check"
          | "tabs"
          | "media_tabs"
          | "rich_table"
          | "evidence_summary"
          | "stat_card"
          | "image_comparison"
          | "callout_banner"
          | "badge_row"
          | "icon_list"
          | "photo_card_gallery"
          | "overview"
          | "simple_image"
          | "highlight_card"
          | "icon_text"
      );
      if (entry.type === "section_heading") notifySectionIndexChanged();
      return;
    }
    setObjectSearch({ type: entry.type, query: "" });
  }

  if (objectSearch?.type === "risk_factor") {
    return (
      <RiskFactorSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "risk_factor", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "clinical_pearl") {
    return (
      <ClinicalPearlSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "clinical_pearl", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "examination_workflow") {
    return (
      <ExaminationWorkflowSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "examination_workflow", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "imaging_findings") {
    return (
      <ImagingFindingSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "imaging_findings", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "reference_list") {
    return (
      <ReferenceSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "reference_list", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "citation_card") {
    return (
      <CitationCardSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "citation_card", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "medical_illustration") {
    return (
      <IllustrationPicker
        onBack={() => setObjectSearch(null)}
        onSelectExisting={async (illustrationId) => {
          onClose();
          await insertMedicalIllustrationBlockAction(diseaseId, afterPosition, illustrationId);
        }}
        onUploadNew={async (formData) => {
          await uploadIllustrationAction(diseaseId, afterPosition, formData);
          onClose();
        }}
      />
    );
  }

  if (objectSearch?.type === "treatment_algorithm") {
    return (
      <TreatmentAlgorithmSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "treatment_algorithm", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  if (objectSearch?.type === "rehabilitation_progression") {
    return (
      <RehabilitationProtocolSearchPanel
        diseaseId={diseaseId}
        afterPosition={afterPosition}
        query={objectSearch.query}
        onQueryChange={(q) => setObjectSearch({ type: "rehabilitation_progression", query: q })}
        onDone={onClose}
        onBack={() => setObjectSearch(null)}
      />
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          placeholder="Search block types…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {!query && suggested.length > 0 && (
          <PickerSection label="Suggested" entries={suggested} onSelect={handleSelect} />
        )}
        {filtered ? (
          filtered.length > 0 ? (
            <PickerSection entries={filtered} onSelect={handleSelect} />
          ) : (
            <p className="px-3 py-4 text-center font-ui text-sm text-secondary">
              No block types match &ldquo;{query}&rdquo;.
            </p>
          )
        ) : (
          BLOCK_GROUPS.map((group) => (
            <PickerSection
              key={group.id}
              label={group.label}
              entries={BLOCK_REGISTRY.filter((entry) => entry.group === group.id)}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

function PickerSection({
  label,
  entries,
  onSelect,
}: {
  label?: string;
  entries: BlockRegistryEntry[];
  onSelect: (entry: BlockRegistryEntry) => void;
}) {
  return (
    <div className="mb-1 last:mb-0">
      {label && (
        <div className="px-3 pt-2 pb-1 font-ui text-xs font-medium tracking-wide text-secondary uppercase">
          {label}
        </div>
      )}
      {entries.map((entry) => {
        const Icon = entry.icon;
        const disabled = entry.status === "future";
        return (
          <button
            key={entry.type}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(entry)}
            className={`flex w-full items-center gap-2.5 rounded px-3 py-1.5 text-left font-ui text-sm ${
              disabled ? "cursor-default text-secondary/50" : "text-primary hover:bg-border/40"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{entry.label}</span>
            {disabled && <span className="font-ui text-xs text-secondary/70">Soon</span>}
          </button>
        );
      })}
    </div>
  );
}

// Risk Factors prove the reuse-first workflow: search existing objects
// (annotated with how many diseases already use each) before "Create
// new" appears at all — findOrCreate enforced by the UI, not left to
// an author's memory (AUTHORING_EXPERIENCE.md).
function RiskFactorSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<{ id: string; name: string; diseaseCount: number }[]>([]);
  // Derived, not stored — "loading" is just "the query we're showing
  // results for hasn't resolved yet." Avoids a synchronous setState in
  // the effect body itself (only the async .then() callback sets
  // state), which is what actually changed between renders here.
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchRiskFactorsAction(query).then((rows) => {
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
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing Risk Factors…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
        {!loading &&
          visibleResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={async () => {
                onDone();
                await insertRiskFactorBlockAction(diseaseId, afterPosition, { riskFactorId: result.id });
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="min-w-0 truncate">{result.name}</span>
              {result.diseaseCount > 0 && (
                <span className="shrink-0 font-ui text-xs text-secondary">
                  Used on {result.diseaseCount} {result.diseaseCount === 1 ? "disease" : "diseases"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertRiskFactorBlockAction(diseaseId, afterPosition, { riskFactorName: trimmed });
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing risk factors.
          </p>
        )}
      </div>
    </div>
  );
}

// Same reuse-first shape as Risk Factors, adapted for a pearl's two
// real differences: matched by body text (pearls have no separate
// canonical_name) and "shared" is read from pearl_attachment, the same
// table Pass 1's usage-count warning already reads.
function ClinicalPearlSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<{ id: string; body: string; attachmentCount: number }[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchClinicalPearlsAction(query).then((rows) => {
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
  const exactMatch = visibleResults.some((r) => r.body.toLowerCase() === trimmed.toLowerCase());

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing Clinical Pearls…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      <div className="max-h-80 overflow-y-auto p-1">
        {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
        {!loading &&
          visibleResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={async () => {
                onDone();
                await insertClinicalPearlBlockAction(diseaseId, afterPosition, { pearlId: result.id });
              }}
              className="flex w-full flex-col gap-0.5 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="line-clamp-2">{result.body}</span>
              {result.attachmentCount > 0 && (
                <span className="font-ui text-xs text-secondary">
                  Used on {result.attachmentCount} {result.attachmentCount === 1 ? "page" : "pages"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertClinicalPearlBlockAction(diseaseId, afterPosition, { pearlBody: trimmed });
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing pearls.
          </p>
        )}
      </div>
    </div>
  );
}

const RELATIONSHIP_OPTIONS: ManeuverRelationship[] = [
  "confirms",
  "assesses_contributing_factor",
  "rules_out",
];

// Examination Workflow is an aggregator (AUTHORING_EXPERIENCE.md): a
// disease has at most one examination_workflow block, so inserting a
// maneuver joins it rather than creating a second, competing block —
// insertExaminationManeuverAction (authoring.ts) does that find-or-
// create itself. The relationship type is a required glyph choice up
// front, the same grammar readers already see, never a hidden default.
function ExaminationWorkflowSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [relationship, setRelationship] = useState<ManeuverRelationship>("confirms");
  const [results, setResults] = useState<{ id: string; name: string; diseaseCount: number }[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [technique, setTechnique] = useState("");
  const [positiveFinding, setPositiveFinding] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchExaminationManeuversAction(query).then((rows) => {
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

  const relationshipPicker = (
    <div className="flex gap-1 border-b border-border p-2">
      {RELATIONSHIP_OPTIONS.map((option) => {
        const { Icon, colorClass } = relationshipGlyph[option];
        const active = relationship === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setRelationship(option)}
            title={maneuverRelationshipLabel[option]}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded px-1 py-1.5 font-ui text-[11px] leading-tight ${
              active ? "bg-border/40" : "hover:bg-border/20"
            }`}
          >
            <Icon className={`size-4 ${colorClass}`} aria-hidden="true" />
            <span className={active ? "text-primary" : "text-secondary"}>
              {maneuverRelationshipLabel[option]}
            </span>
          </button>
        );
      })}
    </div>
  );

  if (creating) {
    const canSave = technique.trim() !== "" && positiveFinding.trim() !== "";
    return (
      <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label="Back"
            className="shrink-0 text-secondary hover:text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-0 truncate font-ui text-sm text-primary">{trimmed}</span>
        </div>
        {relationshipPicker}
        <div className="flex flex-col gap-2 p-3">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">Technique</span>
            <textarea
              autoFocus
              value={technique}
              onChange={(e) => setTechnique(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">Positive finding</span>
            <textarea
              value={positiveFinding}
              onChange={(e) => setPositiveFinding(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            disabled={!canSave}
            onClick={async () => {
              onDone();
              await insertExaminationManeuverAction(
                diseaseId,
                afterPosition,
                { maneuverName: trimmed, technique: technique.trim(), positiveFinding: positiveFinding.trim() },
                relationship
              );
            }}
            className={`rounded px-3 py-1.5 font-ui text-sm ${
              canSave
                ? "bg-accent text-white hover:bg-accent-hover"
                : "cursor-not-allowed bg-border/40 text-secondary"
            }`}
          >
            Add maneuver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing maneuvers…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      {relationshipPicker}
      <div className="max-h-64 overflow-y-auto p-1">
        {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
        {!loading &&
          visibleResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={async () => {
                onDone();
                await insertExaminationManeuverAction(
                  diseaseId,
                  afterPosition,
                  { maneuverId: result.id },
                  relationship
                );
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="min-w-0 truncate">{result.name}</span>
              {result.diseaseCount > 0 && (
                <span className="shrink-0 font-ui text-xs text-secondary">
                  Used on {result.diseaseCount} {result.diseaseCount === 1 ? "disease" : "diseases"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing maneuvers.
          </p>
        )}
      </div>
    </div>
  );
}

const IMAGING_MODALITIES = ["Ultrasound", "Radiograph", "MRI", "CT"];

// Diagnostic Imaging is the second aggregator type — same join
// mechanic as Examination Workflow, but no relationship-glyph choice:
// the schema fixes a finding's relationship to a disease at a single
// value ('suggests'), so there's nothing for an author to pick there.
function ImagingFindingSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<
    { id: string; name: string; modality: string; diseaseCount: number }[]
  >([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [modality, setModality] = useState(IMAGING_MODALITIES[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchImagingFindingsAction(query).then((rows) => {
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

  if (creating) {
    return (
      <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label="Back"
            className="shrink-0 text-secondary hover:text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-0 truncate font-ui text-sm text-primary">{trimmed}</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">Modality</span>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value)}
              className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            >
              {IMAGING_MODALITIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">
              Description (optional)
            </span>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertImagingFindingAction(diseaseId, afterPosition, {
                findingName: trimmed,
                modality: modality.toLowerCase(),
                description,
              });
            }}
            className="rounded bg-accent px-3 py-1.5 font-ui text-sm text-white hover:bg-accent-hover"
          >
            Add finding
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing findings…"
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
              onClick={async () => {
                onDone();
                await insertImagingFindingAction(diseaseId, afterPosition, { findingId: result.id });
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="min-w-0 truncate">
                {result.name}
                <span className="ml-1.5 text-xs text-secondary">({result.modality})</span>
              </span>
              {result.diseaseCount > 0 && (
                <span className="shrink-0 font-ui text-xs text-secondary">
                  Used on {result.diseaseCount} {result.diseaseCount === 1 ? "disease" : "diseases"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing findings.
          </p>
        )}
      </div>
    </div>
  );
}

// References is the third aggregator, and the one with no relationship
// table backing it — searchReferencesAction counts usage by checking
// which reference_list blocks already contain the id (jsonb
// containment), not a join. Create-new needs four fields for a real
// citation; only title is actually required by the schema.
function ReferenceSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<
    { id: string; title: string; authors: string | null; journal: string | null; year: number | null; usageCount: number }[]
  >([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [authors, setAuthors] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchReferencesAction(query).then((rows) => {
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
  const exactMatch = visibleResults.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());

  if (creating) {
    return (
      <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label="Back"
            className="shrink-0 text-secondary hover:text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-0 truncate font-ui text-sm text-primary">{trimmed}</span>
        </div>
        <div className="flex flex-col gap-2 p-3">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">
              Authors (optional)
            </span>
            <input
              autoFocus
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Smith J, Doe A"
              className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-ui text-xs font-medium text-secondary">
                Journal (optional)
              </span>
              <input
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className="font-ui text-xs font-medium text-secondary">Year</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertReferenceAction(diseaseId, afterPosition, { title: trimmed, authors, journal, year });
            }}
            className="rounded bg-accent px-3 py-1.5 font-ui text-sm text-white hover:bg-accent-hover"
          >
            Add reference
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing references…"
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
              onClick={async () => {
                onDone();
                await insertReferenceAction(diseaseId, afterPosition, { referenceId: result.id });
              }}
              className="flex w-full flex-col gap-0.5 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="line-clamp-2">{result.title}</span>
              <span className="font-ui text-xs text-secondary">
                {[result.authors, result.journal, result.year].filter(Boolean).join(" · ")}
                {result.usageCount > 0 &&
                  ` — Used on ${result.usageCount} ${result.usageCount === 1 ? "page" : "pages"}`}
              </span>
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing references.
          </p>
        )}
      </div>
    </div>
  );
}

// Same reuse-first search as Reference List (searchReferencesAction,
// the same `reference` table), but a singular embed like Risk Factor/
// Clinical Pearl rather than an aggregator — each insert is its own
// new citation_card block, not a join into one shared list. The one
// field unique to this panel is `kicker` (e.g. "Landmark Study"), a
// category label the author picks for this specific placement, kept
// in a fixed input above the search box so it's set once regardless
// of whether the reference itself is reused or freshly created.
function CitationCardSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<
    { id: string; title: string; authors: string | null; journal: string | null; year: number | null; usageCount: number }[]
  >([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [kicker, setKicker] = useState("Landmark Study");
  const [authors, setAuthors] = useState("");
  const [journal, setJournal] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchReferencesAction(query).then((rows) => {
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
  const exactMatch = visibleResults.some((r) => r.title.toLowerCase() === trimmed.toLowerCase());

  const kickerField = (
    <div className="border-b border-border p-2">
      <input
        value={kicker}
        onChange={(e) => setKicker(e.target.value)}
        placeholder="Card label (e.g. Landmark Study)"
        className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-xs text-primary outline-none focus:border-accent"
      />
    </div>
  );

  if (creating) {
    return (
      <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <button
            type="button"
            onClick={() => setCreating(false)}
            aria-label="Back"
            className="shrink-0 text-secondary hover:text-primary"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
          </button>
          <span className="min-w-0 truncate font-ui text-sm text-primary">{trimmed}</span>
        </div>
        {kickerField}
        <div className="flex flex-col gap-2 p-3">
          <label className="flex flex-col gap-1">
            <span className="font-ui text-xs font-medium text-secondary">
              Authors (optional)
            </span>
            <input
              autoFocus
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="Smith J, Doe A"
              className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
            />
          </label>
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="font-ui text-xs font-medium text-secondary">
                Journal (optional)
              </span>
              <input
                value={journal}
                onChange={(e) => setJournal(e.target.value)}
                className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className="font-ui text-xs font-medium text-secondary">Year</span>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                className="w-full rounded border border-border bg-surface px-2 py-1 font-ui text-sm text-primary outline-none focus:border-accent"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertCitationCardAction(
                diseaseId,
                afterPosition,
                { title: trimmed, authors, journal, year },
                kicker
              );
            }}
            className="rounded bg-accent px-3 py-1.5 font-ui text-sm text-white hover:bg-accent-hover"
          >
            Add citation card
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing references…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      {kickerField}
      <div className="max-h-64 overflow-y-auto p-1">
        {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
        {!loading &&
          visibleResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={async () => {
                onDone();
                await insertCitationCardAction(diseaseId, afterPosition, { referenceId: result.id }, kicker);
              }}
              className="flex w-full flex-col gap-0.5 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="line-clamp-2">{result.title}</span>
              <span className="font-ui text-xs text-secondary">
                {[result.authors, result.journal, result.year].filter(Boolean).join(" · ")}
                {result.usageCount > 0 &&
                  ` — Used on ${result.usageCount} ${result.usageCount === 1 ? "page" : "pages"}`}
              </span>
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing references.
          </p>
        )}
      </div>
    </div>
  );
}

const LINE_OF_THERAPY_OPTIONS = ["First-line", "Second-line", "Third-line"];

// Treatment Algorithm is a singular embed like Risk Factor/Clinical
// Pearl — search-or-create the algorithm itself here; its steps are
// edited afterward, in place, on the block (TreatmentAlgorithmBlock).
function TreatmentAlgorithmSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<{ id: string; name: string; diseaseCount: number }[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);
  const [lineOfTherapy, setLineOfTherapy] = useState(LINE_OF_THERAPY_OPTIONS[0]);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchTreatmentAlgorithmsAction(query).then((rows) => {
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
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing algorithms…"
          className="w-full bg-transparent font-ui text-sm text-primary outline-none placeholder:text-secondary"
        />
      </div>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="font-ui text-xs font-medium text-secondary">Line of therapy</span>
        <select
          value={lineOfTherapy}
          onChange={(e) => setLineOfTherapy(e.target.value)}
          className="rounded border border-border bg-surface px-1.5 py-0.5 font-ui text-xs text-primary outline-none focus:border-accent"
        >
          {LINE_OF_THERAPY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
      <div className="max-h-64 overflow-y-auto p-1">
        {loading && <p className="px-3 py-3 font-ui text-sm text-secondary">Searching…</p>}
        {!loading &&
          visibleResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={async () => {
                onDone();
                await insertTreatmentAlgorithmBlockAction(
                  diseaseId,
                  afterPosition,
                  { algorithmId: result.id },
                  lineOfTherapy
                );
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="min-w-0 truncate">{result.name}</span>
              {result.diseaseCount > 0 && (
                <span className="shrink-0 font-ui text-xs text-secondary">
                  Used on {result.diseaseCount} {result.diseaseCount === 1 ? "disease" : "diseases"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertTreatmentAlgorithmBlockAction(
                diseaseId,
                afterPosition,
                { algorithmName: trimmed },
                lineOfTherapy
              );
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing algorithms.
          </p>
        )}
      </div>
    </div>
  );
}

// Rehabilitation Progression is also a singular embed — search-or-
// create the protocol here; its exercises (a separate many-to-many
// reuse relationship) are added afterward, in place, on the block.
function RehabilitationProtocolSearchPanel({
  diseaseId,
  afterPosition,
  query,
  onQueryChange,
  onDone,
  onBack,
}: {
  diseaseId: string;
  afterPosition: number;
  query: string;
  onQueryChange: (value: string) => void;
  onDone: () => void;
  onBack: () => void;
}) {
  const [results, setResults] = useState<{ id: string; name: string; diseaseCount: number }[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    searchRehabilitationProtocolsAction(query).then((rows) => {
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
    <div className="w-72 rounded-lg border border-border bg-surface-raised shadow-md">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="shrink-0 text-secondary hover:text-primary"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
        </button>
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search existing protocols…"
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
              onClick={async () => {
                onDone();
                await insertRehabilitationProtocolBlockAction(diseaseId, afterPosition, {
                  protocolId: result.id,
                });
              }}
              className="flex w-full items-center justify-between gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-primary hover:bg-border/40"
            >
              <span className="min-w-0 truncate">{result.name}</span>
              {result.diseaseCount > 0 && (
                <span className="shrink-0 font-ui text-xs text-secondary">
                  Used on {result.diseaseCount} {result.diseaseCount === 1 ? "disease" : "diseases"}
                </span>
              )}
            </button>
          ))}
        {!loading && trimmed && !exactMatch && (
          <button
            type="button"
            onClick={async () => {
              onDone();
              await insertRehabilitationProtocolBlockAction(diseaseId, afterPosition, {
                protocolName: trimmed,
              });
            }}
            className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-left font-ui text-sm text-accent hover:bg-accent/10"
          >
            <Plus className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Create &ldquo;{trimmed}&rdquo;</span>
          </button>
        )}
        {!loading && !trimmed && (
          <p className="px-3 py-3 font-ui text-sm text-secondary">
            Start typing to search existing protocols.
          </p>
        )}
      </div>
    </div>
  );
}

