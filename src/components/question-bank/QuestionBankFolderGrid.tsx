"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { QuestionBankSubjectGroup, QuestionBankFolderTile } from "@/lib/question-bank";
import { QBANK_FOLDER_COLOR_TINT, QBANK_FOLDER_COLOR_BORDER, QBANK_FOLDER_COLOR_ACCENT } from "@/lib/qbank-folder-colors";
import { CARD_COLOR_SWATCH, CARD_COLOR_TEXT } from "@/lib/card-colors";

// "Browse by folder" (QBANK-IMPLEMENTATION.md Pass 2) — subject
// separators, then minimal pastel cards. "The trade-off to accept: a
// minimal card cannot start a session" (QBANK-SPEC.md) — no actions on
// the card beyond the Open link; practising happens from the session
// panel, the filter row, the progress panel, or the folder page.
export function QuestionBankFolderGrid({ groups }: { groups: QuestionBankSubjectGroup[] }) {
  const t = useTranslations("questionBank");

  if (groups.length === 0) return null;

  const totalFolders = groups.reduce((sum, g) => sum + g.folders.length, 0);
  const totalQuestions = groups.reduce((sum, g) => sum + g.folders.reduce((s, f) => s + f.questionCount, 0), 0);

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-2.5">
        <h2 className="font-heading text-lg font-black text-navy">{t("browseByFolder")}</h2>
        <span className="font-ui text-xs font-bold text-secondary">{t("browseByFolderSubtitle", { folders: totalFolders, questions: totalQuestions })}</span>
      </div>

      {groups.map((group) => (
        <div key={group.subjectId} className="flex flex-col">
          <div className="mt-5 mb-2.5 flex items-center gap-2.5">
            <span aria-hidden="true" className={`size-2.5 shrink-0 rounded-[3px] ${CARD_COLOR_SWATCH[group.subjectColor]}`} />
            <span className={`font-ui text-xs font-black tracking-[1.6px] uppercase ${CARD_COLOR_TEXT[group.subjectColor]}`}>{group.subjectName}</span>
            <span aria-hidden="true" className="h-px flex-1 bg-border" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {group.folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FolderCard({ folder }: { folder: QuestionBankFolderTile }) {
  const t = useTranslations("questionBank");
  const accent = QBANK_FOLDER_COLOR_ACCENT[folder.colourKey];

  return (
    <Link
      href={`/question-bank/category/${folder.id}`}
      className="flex flex-col rounded-[18px] p-[18px] pb-4 transition-shadow duration-base hover:shadow-[0_8px_20px_rgba(20,40,74,0.10)]"
      style={{ backgroundColor: QBANK_FOLDER_COLOR_TINT[folder.colourKey] }}
    >
      <span className="font-heading text-xl leading-tight font-black text-navy">{folder.name}</span>
      <span className="mt-1 font-ui text-[12.5px] font-bold text-secondary/90">
        {t("folderCardSubtitle", { topics: folder.setCount, questions: folder.questionCount })}
      </span>
      <div className="mt-3.5 flex items-center">
        <span
          className="rounded-full border bg-white px-3.5 py-1.5 font-ui text-[12.5px] font-black"
          style={{ borderColor: QBANK_FOLDER_COLOR_BORDER[folder.colourKey], color: folder.accuracyPercent === null ? "var(--color-secondary)" : accent }}
        >
          {folder.accuracyPercent === null ? t("notStarted") : t("percentCorrect", { percent: folder.accuracyPercent })}
        </span>
        <span className="ml-auto font-ui text-[13px] font-black" style={{ color: accent }}>
          {t("openFolder")}
        </span>
      </div>
    </Link>
  );
}
