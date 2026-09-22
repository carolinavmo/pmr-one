"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle } from "lucide-react";
import type { SelfCheckBlock } from "@/lib/editorial-blocks";
import { RichEditableText } from "@/components/ui/RichEditableText";
import { updateBlockRichTextAction } from "@/lib/actions/authoring";
import { TEXT_ALIGN_CLASS, ROW_ITEMS_CLASS } from "@/lib/block-alignment";

// Same click-to-reveal shape as EvidenceBadge (Sprint 1) — proven
// interaction, reused rather than reinvented. Ungraded, untracked.
export function SelfCheckBlockView({
  block,
  diseaseSlug,
}: {
  block: SelfCheckBlock;
  diseaseSlug: string;
}) {
  const t = useTranslations("blocks");
  const [revealed, setRevealed] = useState(false);
  const textAlign = block.layout?.textAlign ?? "left";
  const textVerticalAlign = block.layout?.textVerticalAlign ?? "top";

  return (
    <div className="flex flex-col gap-3 rounded-lg border-2 border-border p-3">
      <div className={`flex gap-3 ${ROW_ITEMS_CLASS[textVerticalAlign]}`}>
        <HelpCircle className="size-5 shrink-0 text-secondary" aria-hidden="true" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="font-ui text-xs font-medium text-secondary">{t("testYourself")}</span>
          <RichEditableText
            value={block.question}
            onSave={(value) => updateBlockRichTextAction(block.id, "question", value)}
            as="p"
            className={`font-reading text-base text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
            placeholder="Click to add the question"
            block={block}
            diseaseSlug={diseaseSlug}
            fieldKey="question"
          />
        </div>
      </div>
      {revealed ? (
        <RichEditableText
          value={block.answer}
          onSave={(value) => updateBlockRichTextAction(block.id, "answer", value)}
          as="p"
          className={`border-t border-border pt-3 font-reading text-base text-primary ${TEXT_ALIGN_CLASS[textAlign]}`}
          placeholder="Click to add the answer"
          block={block}
          diseaseSlug={diseaseSlug}
          fieldKey="answer"
        />
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="inline-flex min-h-11 items-center self-start rounded-full border border-border px-4 font-ui text-sm text-accent transition-colors duration-base hover:bg-border/40"
        >
          {t("showAnswer")}
        </button>
      )}
    </div>
  );
}
