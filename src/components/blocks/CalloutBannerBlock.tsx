"use client";

import { useState } from "react";
import { Info, CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import type { CalloutBannerBlock, CalloutTone } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateCalloutBannerAction } from "@/lib/actions/authoring";
import { RichEditableText } from "@/components/ui/RichEditableText";

// "Warning" reads as `insight` (warm amber) and "Error" reads as
// `warning` (a muted red, this app's actual red-flag token) — see
// editorial-blocks.ts's comment on why the token names and the tone
// names don't line up one-to-one.
const TONE_META: Record<
  CalloutTone,
  { label: string; icon: typeof Info; textClass: string; bgClass: string; borderClass: string }
> = {
  info: { label: "Info", icon: Info, textClass: "text-accent", bgClass: "bg-accent/5", borderClass: "border-accent/30" },
  success: { label: "Success", icon: CheckCircle2, textClass: "text-trust", bgClass: "bg-trust/5", borderClass: "border-trust/30" },
  warning: { label: "Warning", icon: AlertTriangle, textClass: "text-insight", bgClass: "bg-insight/5", borderClass: "border-insight/30" },
  error: { label: "Error", icon: XCircle, textClass: "text-warning", bgClass: "bg-warning/5", borderClass: "border-warning/30" },
};

// A generic editorial note in four tones. Dismiss is local UI state
// only, reset on reload — there's no per-user "dismissed banners"
// table backing it, so it never claims to remember a visitor's choice.
export function CalloutBannerBlockView({
  block,
  diseaseSlug,
}: {
  block: CalloutBannerBlock;
  diseaseSlug: string;
}) {
  const { editing } = useEditMode();
  const [tone, setTone] = useState(block.tone);
  const [text, setText] = useState(block.text);
  const [dismissed, setDismissed] = useState(false);

  const commit = (nextTone: CalloutTone, nextText: string) => {
    setTone(nextTone);
    setText(nextText);
    updateCalloutBannerAction(block.id, nextTone, nextText);
  };

  const meta = TONE_META[tone];
  const Icon = meta.icon;

  if (!editing && dismissed) return null;

  return (
    <div className={`flex items-start gap-3 rounded-lg border ${meta.borderClass} ${meta.bgClass} p-3`}>
      <Icon className={`mt-0.5 size-4 shrink-0 ${meta.textClass}`} aria-hidden="true" />
      {editing ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex gap-1">
            {(Object.keys(TONE_META) as CalloutTone[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => commit(t, text)}
                className={`rounded px-2 py-0.5 font-ui text-xs ${
                  t === tone ? `${TONE_META[t].textClass} ${TONE_META[t].bgClass} font-medium` : "text-secondary hover:text-primary"
                }`}
              >
                {TONE_META[t].label}
              </button>
            ))}
          </div>
          <RichEditableText
            as="p"
            value={text}
            onSave={async (html) => commit(tone, html)}
            placeholder="Callout text…"
            className="min-w-0 flex-1 font-ui text-sm text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
        </div>
      ) : (
        <>
          <RichEditableText
            as="p"
            value={text}
            onSave={async (html) => commit(tone, html)}
            placeholder="Callout text…"
            className="min-w-0 flex-1 font-ui text-sm text-primary"
            block={block}
            diseaseSlug={diseaseSlug}
          />
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setDismissed(true)}
            className="shrink-0 text-secondary hover:text-primary"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
