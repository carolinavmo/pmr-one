"use client";

import { useState, type ReactNode } from "react";
import { Plus, X, ChevronUp, ChevronDown, ArrowRight, Check, GitBranch } from "lucide-react";
import type { TreatmentAlgorithmBlock } from "@/lib/editorial-blocks";
import { ClinicalBadge } from "@/components/ui/ClinicalBadge";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  insertTreatmentAlgorithmStepAction,
  updateTreatmentAlgorithmStepAction,
  deleteTreatmentAlgorithmStepAction,
  moveTreatmentAlgorithmStepAction,
} from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { RichEditableText } from "@/components/ui/RichEditableText";
import type { EditorialBlock } from "@/lib/editorial-blocks";

type Step = TreatmentAlgorithmBlock["algorithm"]["steps"][number];
type Flow = ReturnType<typeof buildFlow>;

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

// A step is a decision node once it has either branch target set. The
// read view walks the ordered steps: everything before the first
// decision is a linear trunk (connected boxes), the decision itself
// renders as a diamond, and each branch target starts its own short
// outcome chain — stacked into one card rather than rendered as
// further separate connected boxes (matching the founder's reference
// image, where "Adjuncts" and "Surgery" both sit inside the single
// "No" outcome). Deliberately single-decision: an algorithm with a
// second decision node further down the step list isn't specially
// handled — every real algorithm authored so far only needs one. The
// editor reuses this same function, so what an author sees while
// building the flowchart is exactly what gets rendered afterward —
// one layout, not a separate "editor view" that has to be kept in
// sync with a different "read view" by hand.
function buildFlow(steps: Step[]) {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  const decisionIndex = sorted.findIndex((s) => s.nextStepIfTrue || s.nextStepIfFalse);
  if (decisionIndex === -1) {
    return { trunk: sorted, decision: null as Step | null, yesChain: [] as Step[], noChain: [] as Step[] };
  }
  const trunk = sorted.slice(0, decisionIndex);
  const decision = sorted[decisionIndex];
  const yesIndex = decision.nextStepIfTrue ? sorted.findIndex((s) => s.id === decision.nextStepIfTrue) : -1;
  const noIndex = decision.nextStepIfFalse ? sorted.findIndex((s) => s.id === decision.nextStepIfFalse) : -1;
  const boundaries = [yesIndex, noIndex].filter((i) => i !== -1).sort((a, b) => a - b);
  const chainFrom = (startIndex: number) => {
    if (startIndex === -1) return [];
    const nextBoundary = boundaries.find((b) => b > startIndex);
    return sorted.slice(startIndex, nextBoundary ?? sorted.length);
  };
  return { trunk, decision, yesChain: chainFrom(yesIndex), noChain: chainFrom(noIndex) };
}

// Ordered step-through (spec §11A) rendered — in both the read view
// and the editor — as the same flowchart: a trunk of connected boxes
// leading to at most one Yes/No decision diamond, each branch ending
// in a stacked outcome card. "+" controls sit directly at the point in
// the diagram a new step would appear (end of the trunk, end of a
// branch's stack) rather than a single flat "add step" field at the
// bottom of a text list — editing looks like the thing it's building.
// Steps still belong to the algorithm object itself, not this block,
// so each edit is a direct server round-trip per step.
export function TreatmentAlgorithmBlockView({
  block,
  diseaseSlug,
}: {
  block: TreatmentAlgorithmBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const { algorithm } = block;
  const steps = [...algorithm.steps].sort((a, b) => a.order - b.order);

  const flow = buildFlow(steps);

  // `instruction`/`branchCondition` are both RichEditableText fields,
  // which stage their own edits internally until blur — no local draft
  // state needed here anymore. The field not being edited falls back
  // to its current value straight off `step`, not a parallel draft.
  const commitStep = (step: Step, patch: Partial<Step> = {}) => {
    const next = { ...step, ...patch };
    updateTreatmentAlgorithmStepAction(
      step.id,
      next.instruction,
      next.branchCondition ?? "",
      next.icon,
      next.nextStepIfTrue,
      next.nextStepIfFalse
    );
  };

  const addTrunkStep = async () => {
    const afterId = flow.trunk.length > 0 ? flow.trunk[flow.trunk.length - 1].id : null;
    await insertTreatmentAlgorithmStepAction(algorithm.id, afterId, "");
  };

  // A step only counts as a decision once it has a branch target set
  // (buildFlow derives it purely from the data, no separate "is this a
  // decision" flag) — so a freshly-inserted blank step would render as
  // just another trunk box, not a diamond, until something points at
  // it. Seeding one blank Yes-outcome and wiring the pointer in the
  // same action means the fork is visible immediately: a diamond with
  // one empty outcome box ready to type into, plus an "Add no outcome"
  // control for the second branch — not a dead click that silently
  // extends the trunk instead.
  const addDecision = async () => {
    const afterId = flow.trunk.length > 0 ? flow.trunk[flow.trunk.length - 1].id : null;
    const decisionId = await insertTreatmentAlgorithmStepAction(algorithm.id, afterId, "");
    const yesId = await insertTreatmentAlgorithmStepAction(algorithm.id, decisionId, "");
    await updateTreatmentAlgorithmStepAction(decisionId, "", "", undefined, yesId, undefined);
  };

  const addOutcome = async (branch: "yes" | "no") => {
    if (!flow.decision) return;
    const chain = branch === "yes" ? flow.yesChain : flow.noChain;
    const afterId = chain.length > 0 ? chain[chain.length - 1].id : steps[steps.length - 1]?.id ?? null;
    const newId = await insertTreatmentAlgorithmStepAction(algorithm.id, afterId, "");
    if (chain.length === 0) {
      commitStep(flow.decision, {
        nextStepIfTrue: branch === "yes" ? newId : flow.decision.nextStepIfTrue,
        nextStepIfFalse: branch === "no" ? newId : flow.decision.nextStepIfFalse,
      });
    }
  };

  const moveWithinGroup = (group: Step[], step: Step, direction: "up" | "down") => {
    const index = group.findIndex((s) => s.id === step.id);
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === group.length - 1) return;
    moveTreatmentAlgorithmStepAction(algorithm.id, step.id, step.order, direction);
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface-raised p-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-reading text-lg text-primary">{algorithm.name}</h3>
          {algorithm.lineOfTherapy && <ClinicalBadge>{algorithm.lineOfTherapy}</ClinicalBadge>}
        </div>
        <FlowLayout
          flow={flow}
          renderTrunkStep={(step) => <StepBoxView step={step} block={block} diseaseSlug={diseaseSlug} />}
          renderDecision={(step) => <DecisionDiamondView step={step} block={block} diseaseSlug={diseaseSlug} />}
          renderBranch={(label, tone, chain) => (
            <BranchOutcomeView label={label} tone={tone} steps={chain} block={block} diseaseSlug={diseaseSlug} />
          )}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-reading text-lg text-primary">{algorithm.name}</h3>
        {algorithm.lineOfTherapy && <ClinicalBadge>{algorithm.lineOfTherapy}</ClinicalBadge>}
      </div>

      <FlowLayout
        flow={flow}
        renderTrunkStep={(step) => (
          <StepBoxEdit
            step={step}
            block={block}
            diseaseSlug={diseaseSlug}
            onInstructionSave={(html) => commitStep(step, { instruction: html })}
            onIconPick={(icon) => commitStep(step, { icon })}
            onMoveUp={() => moveWithinGroup(flow.trunk, step, "up")}
            onMoveDown={() => moveWithinGroup(flow.trunk, step, "down")}
            canMoveUp={flow.trunk.findIndex((s) => s.id === step.id) > 0}
            canMoveDown={flow.trunk.findIndex((s) => s.id === step.id) < flow.trunk.length - 1}
            onDelete={() => deleteTreatmentAlgorithmStepAction(step.id)}
          />
        )}
        renderDecision={(step) => (
          <DecisionDiamondEdit
            step={step}
            block={block}
            diseaseSlug={diseaseSlug}
            onInstructionSave={(html) => commitStep(step, { instruction: html })}
            onIconPick={(icon) => commitStep(step, { icon })}
            onDelete={() => deleteTreatmentAlgorithmStepAction(step.id)}
          />
        )}
        renderBranch={(label, tone, chain) => (
          <BranchOutcomeEdit
            label={label}
            tone={tone}
            steps={chain}
            block={block}
            diseaseSlug={diseaseSlug}
            onInstructionSave={(step, html) => commitStep(step, { instruction: html })}
            onNoteSave={(step, html) => commitStep(step, { branchCondition: html })}
            onIconPick={(step, icon) => commitStep(step, { icon })}
            onMoveUp={(step) => moveWithinGroup(chain, step, "up")}
            onMoveDown={(step) => moveWithinGroup(chain, step, "down")}
            onDelete={(step) => deleteTreatmentAlgorithmStepAction(step.id)}
            onAdd={() => addOutcome(label === "Yes" ? "yes" : "no")}
          />
        )}
        trunkTrailer={
          !flow.decision && (
            <div className="flex shrink-0 items-stretch gap-2">
              <button
                type="button"
                onClick={addTrunkStep}
                className="flex w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-secondary hover:border-accent hover:text-accent"
              >
                <Plus className="size-4" aria-hidden="true" />
                <span className="font-ui text-xs">Step</span>
              </button>
              <button
                type="button"
                onClick={addDecision}
                className="flex w-28 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-secondary hover:border-accent hover:text-accent"
              >
                <GitBranch className="size-4" aria-hidden="true" />
                <span className="font-ui text-xs">Decision</span>
              </button>
            </div>
          )
        }
      />
    </div>
  );
}

// Shared shape between the read view and the editor — everything
// before the decision runs left-to-right with arrows, the decision
// itself (if any) sits at the end of that row, and the two branch
// outcomes sit in a row underneath. `trunkTrailer` is where the
// editor's "+ Step" / "+ Decision" controls attach; the read view
// simply never passes one.
function FlowLayout({
  flow,
  renderTrunkStep,
  renderDecision,
  renderBranch,
  trunkTrailer,
}: {
  flow: Flow;
  renderTrunkStep: (step: Step) => ReactNode;
  renderDecision: (step: Step) => ReactNode;
  renderBranch: (label: "Yes" | "No", tone: "trust" | "warning", chain: Step[]) => ReactNode;
  trunkTrailer?: ReactNode;
}) {
  const { trunk, decision, yesChain, noChain } = flow;
  return (
    <div className="flex flex-col gap-3 overflow-x-auto pb-1">
      <div className="flex items-stretch gap-2">
        {trunk.map((step) => (
          <div key={step.id} className="flex items-center gap-2">
            {renderTrunkStep(step)}
            <ArrowRight className="size-4 shrink-0 text-secondary" aria-hidden="true" />
          </div>
        ))}
        {decision ? renderDecision(decision) : trunkTrailer}
      </div>
      {decision && (
        <div className="flex flex-wrap gap-4">
          {renderBranch("Yes", "trust", yesChain)}
          {renderBranch("No", "warning", noChain)}
        </div>
      )}
    </div>
  );
}

function StepBoxView({
  step,
  block,
  diseaseSlug,
}: {
  step: Step;
  block: EditorialBlock;
  diseaseSlug: string;
}) {
  const Icon = step.icon && isCardIconName(step.icon) ? cardIcons[step.icon] : null;
  return (
    <div className="flex w-52 shrink-0 items-start gap-2 rounded-md border border-border bg-surface p-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-raised text-accent">
        {Icon ? <Icon className="size-4" aria-hidden="true" /> : <ArrowRight className="size-4" aria-hidden="true" />}
      </span>
      <RichEditableText
        as="span"
        value={step.instruction}
        onSave={async () => {}}
        placeholder=""
        className="font-ui text-sm font-medium text-primary"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </div>
  );
}

function DecisionDiamondView({
  step,
  block,
  diseaseSlug,
}: {
  step: Step;
  block: EditorialBlock;
  diseaseSlug: string;
}) {
  const Icon = step.icon && isCardIconName(step.icon) ? cardIcons[step.icon] : cardIcons.clock;
  return (
    <div className="flex size-36 shrink-0 items-center justify-center">
      <div className="flex size-28 rotate-45 items-center justify-center rounded-lg border-2 border-accent bg-accent/5">
        <div className="flex -rotate-45 flex-col items-center gap-1 px-2 text-center">
          <Icon className="size-4 text-accent" aria-hidden="true" />
          <RichEditableText
            as="span"
            value={step.instruction}
            onSave={async () => {}}
            placeholder=""
            className="font-ui text-xs font-medium text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
        </div>
      </div>
    </div>
  );
}

function BranchOutcomeView({
  label,
  tone,
  steps,
  block,
  diseaseSlug,
}: {
  label: string;
  tone: "trust" | "warning";
  steps: Step[];
  block: EditorialBlock;
  diseaseSlug: string;
}) {
  if (steps.length === 0) return null;
  const toneClass = tone === "trust" ? "border-trust/40 bg-trust/5 text-trust" : "border-warning/40 bg-warning/5 text-warning";
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-3 shrink-0 rounded-full border px-2 py-0.5 font-ui text-xs font-medium ${toneClass}`}>
        {label}
      </span>
      <div className="flex min-w-52 flex-col divide-y divide-border rounded-md border border-border bg-surface">
        {steps.map((step) => {
          const Icon = step.icon && isCardIconName(step.icon) ? cardIcons[step.icon] : null;
          return (
            <div key={step.id} className="flex items-start gap-2 p-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-surface-raised text-secondary">
                {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : <Check className="size-3.5" aria-hidden="true" />}
              </span>
              <div className="flex flex-col">
                <RichEditableText
                  as="span"
                  value={step.instruction}
                  onSave={async () => {}}
                  placeholder=""
                  className="font-ui text-sm font-medium text-primary"
                  block={block}
                  diseaseSlug={diseaseSlug}
                />
                {step.branchCondition && (
                  <RichEditableText
                    as="span"
                    value={step.branchCondition}
                    onSave={async () => {}}
                    placeholder=""
                    className="font-ui text-xs text-secondary"
                    block={block}
                    diseaseSlug={diseaseSlug}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepBoxEdit({
  step,
  block,
  diseaseSlug,
  onInstructionSave,
  onIconPick,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  onDelete,
}: {
  step: Step;
  block: EditorialBlock;
  diseaseSlug: string;
  onInstructionSave: (html: string) => void;
  onIconPick: (icon: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onDelete: () => void;
}) {
  return (
    <div className="flex w-52 shrink-0 flex-col gap-1.5 rounded-md border border-border bg-surface p-2">
      <div className="flex items-center justify-between gap-1">
        <IconPickerButton icon={step.icon} fallback={<ArrowRight className="size-3.5" aria-hidden="true" />} onPick={onIconPick} />
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label="Move step earlier"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
          >
            <ChevronUp className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Move step later"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
          >
            <ChevronDown className="size-3" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Delete step"
            onClick={onDelete}
            className="flex size-5 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
          >
            <X className="size-3" aria-hidden="true" />
          </button>
        </div>
      </div>
      <RichEditableText
        value={step.instruction}
        onSave={async (html) => onInstructionSave(html)}
        placeholder="Instruction"
        className="w-full font-ui text-sm font-medium text-primary"
        block={block}
        diseaseSlug={diseaseSlug}
      />
    </div>
  );
}

function DecisionDiamondEdit({
  step,
  block,
  diseaseSlug,
  onInstructionSave,
  onIconPick,
  onDelete,
}: {
  step: Step;
  block: EditorialBlock;
  diseaseSlug: string;
  onInstructionSave: (html: string) => void;
  onIconPick: (icon: string) => void;
  onDelete: () => void;
}) {
  return (
    <div className="relative flex size-40 shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label="Remove decision"
        onClick={onDelete}
        className="absolute top-0 right-0 z-10 flex size-5 items-center justify-center rounded-full border border-border bg-surface-raised text-secondary hover:bg-warning/10 hover:text-warning"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
      <div className="flex size-32 rotate-45 flex-col items-center justify-center gap-1 rounded-lg border-2 border-accent bg-accent/5 p-3">
        <div className="-rotate-45">
          <IconPickerButton icon={step.icon} fallback={<span className="font-ui text-xs">?</span>} onPick={onIconPick} />
        </div>
        {/* -rotate-45 wraps the whole field (toolbar included), not
            just the text, since RichEditableText's own `className`
            prop only reaches the editable content — the toolbar is a
            sibling inside its own wrapper and would otherwise render
            diagonally, inheriting the diamond's rotate-45. */}
        <div className="w-20 -rotate-45">
          <RichEditableText
            value={step.instruction}
            onSave={async (html) => onInstructionSave(html)}
            placeholder="Question?"
            className="text-center font-ui text-xs font-medium text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
        </div>
      </div>
    </div>
  );
}

function BranchOutcomeEdit({
  label,
  tone,
  steps,
  block,
  diseaseSlug,
  onInstructionSave,
  onNoteSave,
  onIconPick,
  onMoveUp,
  onMoveDown,
  onDelete,
  onAdd,
}: {
  label: "Yes" | "No";
  tone: "trust" | "warning";
  steps: Step[];
  block: EditorialBlock;
  diseaseSlug: string;
  onInstructionSave: (step: Step, html: string) => void;
  onNoteSave: (step: Step, html: string) => void;
  onIconPick: (step: Step, icon: string) => void;
  onMoveUp: (step: Step) => void;
  onMoveDown: (step: Step) => void;
  onDelete: (step: Step) => void;
  onAdd: () => void;
}) {
  const toneClass = tone === "trust" ? "border-trust/40 bg-trust/5 text-trust" : "border-warning/40 bg-warning/5 text-warning";
  return (
    <div className="flex items-start gap-2">
      <span className={`mt-3 shrink-0 rounded-full border px-2 py-0.5 font-ui text-xs font-medium ${toneClass}`}>
        {label}
      </span>
      <div className="flex min-w-56 flex-col gap-2">
        <div className="flex flex-col divide-y divide-border rounded-md border border-border bg-surface">
          {steps.map((step, index) => {
            return (
              <div key={step.id} className="flex flex-col gap-1 p-2">
                <div className="flex items-center justify-between gap-1">
                  <IconPickerButton
                    icon={step.icon}
                    fallback={<Check className="size-3.5" aria-hidden="true" />}
                    onPick={(icon) => onIconPick(step, icon)}
                  />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Move outcome earlier"
                      disabled={index === 0}
                      onClick={() => onMoveUp(step)}
                      className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                    >
                      <ChevronUp className="size-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Move outcome later"
                      disabled={index === steps.length - 1}
                      onClick={() => onMoveDown(step)}
                      className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                    >
                      <ChevronDown className="size-3" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete outcome"
                      onClick={() => onDelete(step)}
                      className="flex size-5 items-center justify-center rounded text-secondary hover:bg-warning/10 hover:text-warning"
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </div>
                </div>
                <RichEditableText
                  value={step.instruction}
                  onSave={async (html) => onInstructionSave(step, html)}
                  placeholder="Outcome"
                  className="w-full font-ui text-sm font-medium text-primary"
                  block={block}
                  diseaseSlug={diseaseSlug}
                />
                <RichEditableText
                  value={step.branchCondition ?? ""}
                  onSave={async (html) => onNoteSave(step, html)}
                  placeholder="Note (optional)"
                  className="w-full font-ui text-xs text-secondary"
                  block={block}
                  diseaseSlug={diseaseSlug}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 rounded px-2 py-1 font-ui text-xs text-accent hover:bg-accent/10"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Add {label.toLowerCase()} outcome
        </button>
      </div>
    </div>
  );
}

function IconPickerButton({
  icon,
  fallback,
  onPick,
}: {
  icon?: string;
  fallback?: ReactNode;
  onPick: (icon: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const Icon = icon && isCardIconName(icon) ? cardIcons[icon] : null;

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Pick icon"
        className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-secondary hover:text-primary"
      >
        {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : fallback}
      </button>
      {open && (
        <div className="absolute top-8 left-0 z-10 grid w-44 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
          {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
            const OptionIcon = cardIcons[name];
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => {
                  setOpen(false);
                  onPick(name);
                }}
                className="flex size-6 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
              >
                <OptionIcon className="size-3.5" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
