"use client";

import { useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowDown,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { TimelineBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import {
  updateTimelineStepsAction,
  updateTimelineTitleAction,
  updateTimelineOrientationAction,
} from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";
import { RichEditableText } from "@/components/ui/RichEditableText";

type Step = { label: string; description?: string; icon?: string };

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

// Owns-content, no Knowledge Object underneath — a labeled sequence
// (e.g. a symptom or recovery timeline) rendered as connected icon
// nodes rather than a vertical numbered list: a circle per step
// (author-picked icon, falling back to the step's position when
// unset) with its label and description underneath, joined by arrows.
export function TimelineBlockView({
  block,
  diseaseSlug,
}: {
  block: TimelineBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [title, setTitle] = useState(block.title ?? "");
  const [subtitle, setSubtitle] = useState(block.subtitle ?? "");
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    block.orientation ?? "horizontal"
  );
  const [steps, setSteps] = useState<Step[]>(block.steps);

  const commitSteps = (next: Step[]) => {
    setSteps(next);
    updateTimelineStepsAction(block.id, next);
  };

  const commitTitle = (nextTitle: string, nextSubtitle: string) => {
    setTitle(nextTitle);
    setSubtitle(nextSubtitle);
    updateTimelineTitleAction(block.id, nextTitle, nextSubtitle);
  };

  const commitOrientation = (next: "horizontal" | "vertical") => {
    setOrientation(next);
    updateTimelineOrientationAction(block.id, next);
  };

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {(title || subtitle) && (
          <div className="flex flex-col gap-0.5">
            {title && (
              <RichEditableText
                as="h3"
                value={title}
                onSave={async (html) => commitTitle(html, subtitle)}
                placeholder=""
                className="font-reading text-lg font-semibold text-primary"
                block={block}
                diseaseSlug={diseaseSlug}
              />
            )}
            {subtitle && (
              <RichEditableText
                as="p"
                value={subtitle}
                onSave={async (html) => commitTitle(title, html)}
                placeholder=""
                className="font-ui text-sm text-secondary"
                block={block}
                diseaseSlug={diseaseSlug}
              />
            )}
          </div>
        )}
        {orientation === "vertical" ? (
          <div className="flex flex-col gap-1">
            {steps.map((step, index) => {
              const Icon = step.icon && isCardIconName(step.icon) ? cardIcons[step.icon] : null;
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-accent">
                      {Icon ? <Icon className="size-6" aria-hidden="true" /> : (
                        <span className="font-ui text-base font-semibold">{index + 1}</span>
                      )}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <RichEditableText
                        as="span"
                        value={step.label}
                        onSave={async (html) =>
                          commitSteps(steps.map((s, i) => (i === index ? { ...s, label: html } : s)))
                        }
                        placeholder=""
                        className="font-ui text-sm font-semibold text-primary"
                        block={block}
                        diseaseSlug={diseaseSlug}
                      />
                      {step.description && (
                        <RichEditableText
                          as="span"
                          value={step.description}
                          onSave={async (html) =>
                            commitSteps(
                              steps.map((s, i) => (i === index ? { ...s, description: html } : s))
                            )
                          }
                          placeholder=""
                          className="font-ui text-xs text-secondary"
                          block={block}
                          diseaseSlug={diseaseSlug}
                        />
                      )}
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex w-14 shrink-0 justify-center">
                      <ArrowDown className="size-4 text-secondary" aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-2 overflow-x-auto pb-1">
            {steps.map((step, index) => {
              const Icon = step.icon && isCardIconName(step.icon) ? cardIcons[step.icon] : null;
              return (
                <div key={index} className="flex items-start gap-2">
                  <div className="flex w-28 shrink-0 flex-col items-center gap-2 text-center">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-accent">
                      {Icon ? <Icon className="size-6" aria-hidden="true" /> : (
                        <span className="font-ui text-base font-semibold">{index + 1}</span>
                      )}
                    </span>
                    <RichEditableText
                      as="span"
                      value={step.label}
                      onSave={async (html) =>
                        commitSteps(steps.map((s, i) => (i === index ? { ...s, label: html } : s)))
                      }
                      placeholder=""
                      className="font-ui text-sm font-semibold text-primary"
                      block={block}
                      diseaseSlug={diseaseSlug}
                    />
                    {step.description && (
                      <RichEditableText
                        as="span"
                        value={step.description}
                        onSave={async (html) =>
                          commitSteps(
                            steps.map((s, i) => (i === index ? { ...s, description: html } : s))
                          )
                        }
                        placeholder=""
                        className="font-ui text-xs text-secondary"
                        block={block}
                        diseaseSlug={diseaseSlug}
                      />
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="mt-6 size-4 shrink-0 text-secondary" aria-hidden="true" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-dashed border-border p-3">
      <div className="flex flex-col gap-1">
        <RichEditableText
          value={title}
          onSave={async (html) => commitTitle(html, subtitle)}
          placeholder="Title (optional)"
          className="w-full font-reading text-lg font-semibold text-primary"
          block={block}
          diseaseSlug={diseaseSlug}
        />
        <RichEditableText
          value={subtitle}
          onSave={async (html) => commitTitle(title, html)}
          placeholder="Subtitle (optional)"
          className="w-full font-ui text-sm text-secondary"
          block={block}
          diseaseSlug={diseaseSlug}
        />
      </div>
      <div className="flex w-fit items-center gap-1 rounded-md border border-border p-0.5">
        <button
          type="button"
          aria-label="Horizontal layout"
          aria-pressed={orientation === "horizontal"}
          onClick={() => commitOrientation("horizontal")}
          className={`flex items-center gap-1 rounded px-2 py-1 font-ui text-xs transition-colors duration-base ${
            orientation === "horizontal"
              ? "bg-accent/10 text-accent"
              : "text-secondary hover:text-primary"
          }`}
        >
          <ArrowRight className="size-3.5" aria-hidden="true" />
          Horizontal
        </button>
        <button
          type="button"
          aria-label="Vertical layout"
          aria-pressed={orientation === "vertical"}
          onClick={() => commitOrientation("vertical")}
          className={`flex items-center gap-1 rounded px-2 py-1 font-ui text-xs transition-colors duration-base ${
            orientation === "vertical"
              ? "bg-accent/10 text-accent"
              : "text-secondary hover:text-primary"
          }`}
        >
          <ArrowDown className="size-3.5" aria-hidden="true" />
          Vertical
        </button>
      </div>
      {orientation === "vertical" ? (
        <div className="flex flex-col gap-1">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col gap-1">
              <div className="flex items-start gap-3">
                <IconPickerButton
                  icon={step.icon}
                  fallback={<span className="font-ui text-sm font-semibold">{index + 1}</span>}
                  onPick={(icon) =>
                    commitSteps(steps.map((s, i) => (i === index ? { ...s, icon } : s)))
                  }
                />
                <div className="flex flex-1 flex-col gap-1 pt-1">
                  <RichEditableText
                    value={step.label}
                    onSave={async (html) =>
                      commitSteps(steps.map((s, i) => (i === index ? { ...s, label: html } : s)))
                    }
                    placeholder="Label"
                    className="w-full font-ui text-sm font-semibold text-primary"
                    block={block}
                    diseaseSlug={diseaseSlug}
                  />
                  <RichEditableText
                    value={step.description ?? ""}
                    onSave={async (html) =>
                      commitSteps(
                        steps.map((s, i) => (i === index ? { ...s, description: html } : s))
                      )
                    }
                    placeholder="Description"
                    className="w-full font-ui text-xs text-secondary"
                    block={block}
                    diseaseSlug={diseaseSlug}
                  />
                </div>
                <StepMoveDeleteControls
                  index={index}
                  count={steps.length}
                  direction="vertical"
                  onMoveEarlier={() => {
                    const next = [...steps];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    commitSteps(next);
                  }}
                  onMoveLater={() => {
                    const next = [...steps];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    commitSteps(next);
                  }}
                  onDelete={() => commitSteps(steps.filter((_, i) => i !== index))}
                />
              </div>
              {index < steps.length - 1 && (
                <div className="flex w-14 shrink-0 justify-center">
                  <ArrowDown className="size-4 text-secondary" aria-hidden="true" />
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => commitSteps([...steps, { label: "", description: "" }])}
            className="flex w-14 items-center justify-center rounded-full border border-dashed border-border p-2 text-secondary hover:border-accent hover:text-accent"
            aria-label="Add step"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className="flex items-start gap-2 overflow-x-auto pb-1">
          {steps.map((step, index) => {
            return (
              <div key={index} className="flex items-start gap-2">
                <div className="flex w-32 shrink-0 flex-col items-center gap-1.5">
                  <IconPickerButton
                    icon={step.icon}
                    fallback={<span className="font-ui text-sm font-semibold">{index + 1}</span>}
                    onPick={(icon) =>
                      commitSteps(steps.map((s, i) => (i === index ? { ...s, icon } : s)))
                    }
                  />
                  <RichEditableText
                    value={step.label}
                    onSave={async (html) =>
                      commitSteps(steps.map((s, i) => (i === index ? { ...s, label: html } : s)))
                    }
                    placeholder="Label"
                    className="w-full text-center font-ui text-sm font-semibold text-primary"
                    block={block}
                    diseaseSlug={diseaseSlug}
                  />
                  <RichEditableText
                    value={step.description ?? ""}
                    onSave={async (html) =>
                      commitSteps(
                        steps.map((s, i) => (i === index ? { ...s, description: html } : s))
                      )
                    }
                    placeholder="Description"
                    className="w-full text-center font-ui text-xs text-secondary"
                    block={block}
                    diseaseSlug={diseaseSlug}
                  />
                  <StepMoveDeleteControls
                    index={index}
                    count={steps.length}
                    direction="horizontal"
                    onMoveEarlier={() => {
                      const next = [...steps];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      commitSteps(next);
                    }}
                    onMoveLater={() => {
                      const next = [...steps];
                      [next[index], next[index + 1]] = [next[index + 1], next[index]];
                      commitSteps(next);
                    }}
                    onDelete={() => commitSteps(steps.filter((_, i) => i !== index))}
                  />
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="mt-5 size-4 shrink-0 text-secondary" aria-hidden="true" />
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => commitSteps([...steps, { label: "", description: "" }])}
            className="mt-5 flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-border text-secondary hover:border-accent hover:text-accent"
            aria-label="Add step"
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

// Shared move-earlier/move-later/delete trio for one step, laid out
// left-to-right (ChevronLeft/Right) under a horizontal step or
// top-to-bottom (ChevronUp/Down) beside a vertical one — same three
// actions either orientation, just rotated to match which direction
// "earlier"/"later" actually reads in that layout.
function StepMoveDeleteControls({
  index,
  count,
  direction,
  onMoveEarlier,
  onMoveLater,
  onDelete,
}: {
  index: number;
  count: number;
  direction: "horizontal" | "vertical";
  onMoveEarlier: () => void;
  onMoveLater: () => void;
  onDelete: () => void;
}) {
  const EarlierIcon = direction === "horizontal" ? ChevronLeft : ChevronUp;
  const LaterIcon = direction === "horizontal" ? ChevronRight : ChevronDown;
  return (
    <div
      className={`flex items-center gap-0.5 ${direction === "vertical" ? "flex-col pt-1" : ""}`}
    >
      <button
        type="button"
        aria-label="Move step earlier"
        disabled={index === 0}
        onClick={onMoveEarlier}
        className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
      >
        <EarlierIcon className="size-3" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Move step later"
        disabled={index === count - 1}
        onClick={onMoveLater}
        className="flex size-5 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
      >
        <LaterIcon className="size-3" aria-hidden="true" />
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
        className="flex size-14 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-accent hover:border-accent"
      >
        {Icon ? <Icon className="size-6" aria-hidden="true" /> : fallback}
      </button>
      {open && (
        <div className="absolute top-16 left-1/2 z-10 grid w-44 -translate-x-1/2 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
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
