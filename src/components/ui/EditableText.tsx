"use client";

import { useRef, useState, type ElementType } from "react";
import { Check } from "lucide-react";
import { useEditMode } from "@/components/disease-page/EditMode";

interface EditableTextProps {
  value: string;
  onSave: (value: string) => Promise<void>;
  as?: ElementType;
  className?: string;
  multiline?: boolean;
  placeholder?: string;
  // Section headings need a stable anchor id for the Contents rail —
  // passed through untouched in both editing and static states.
  id?: string;
}

// Shared by every prose surface (paragraph body, section heading,
// key point, a clinical pearl's body) — one interaction, not four
// one-offs. Not editing (no Provider above it, or the toggle is off):
// renders `value` in the exact tag/classes it always used, visually
// identical to a page that's never heard of edit mode.
export function EditableText({
  value,
  onSave,
  as: Tag = "p",
  className = "",
  multiline = true,
  placeholder = "Click to add text",
  id,
}: EditableTextProps) {
  const { editing: editModeOn } = useEditMode();
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  if (!editModeOn) {
    return (
      <Tag id={id} className={className}>
        {value || placeholder}
      </Tag>
    );
  }

  if (!isEditing) {
    return (
      <Tag
        id={id}
        className={`${className} cursor-text rounded outline-dashed outline-1 outline-border/60 transition-colors duration-base hover:bg-accent/5 ${
          !value ? "text-secondary italic" : ""
        }`}
        onClick={() => {
          setDraft(value);
          setIsEditing(true);
        }}
      >
        {value || placeholder}
      </Tag>
    );
  }

  const commit = async () => {
    setIsEditing(false);
    if (draft !== value) {
      await onSave(draft);
    }
  };

  const sharedProps = {
    ref: ref as never,
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) =>
      setDraft(e.target.value),
    onBlur: commit,
    autoFocus: true,
    className: `${className} w-full resize-none rounded border border-accent bg-surface-raised px-2 py-1 outline-none`,
  };

  return (
    <div className="relative">
      {multiline ? <textarea {...sharedProps} rows={3} /> : <input {...sharedProps} type="text" />}
      {/* Explicit save affordance, right on the field — onBlur already
          commits (clicking away saves just fine), but reaching for a
          page/section-level "Done" button out of habit meant scrolling
          back to it on a long page. onMouseDown prevents the button
          itself from stealing focus first, so this fires as a normal
          click rather than racing the field's own onBlur. */}
      <button
        type="button"
        aria-label="Save"
        onMouseDown={(e) => e.preventDefault()}
        onClick={commit}
        className="absolute -right-2 -bottom-2 flex size-6 items-center justify-center rounded-full bg-accent text-white shadow-sm hover:bg-accent/90"
      >
        <Check className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  );
}
