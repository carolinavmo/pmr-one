"use client";

import { useEffect, useState } from "react";
import { useTranslations, useFormatter } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AtlasPage, LinkedDiseaseSummary, AtlasBacklink } from "@/lib/atlas";

interface OutlineEntry {
  id: string;
  text: string;
  level: 1 | 2 | 3;
}

// HANDBOOK-SPEC.md's third column (250px) — Pass 4: "On this page"
// (outline + scroll-spy), "From the library" (the linked disease +
// review date), "Linked from" (backlinks), and "Template". Reads
// headings out of the live DOM (AtlasEditor.tsx's own
// #atlas-page-body-<id> wrapper) rather than re-parsing page.body
// itself, so the outline reflects whichever RichEditableText render
// branch is actually on screen (editing vs. reading use different
// markup for the same content).
export function AtlasContextRail({
  page,
  linkedDisease,
  backlinks,
  templateTitle,
}: {
  page: AtlasPage | null;
  linkedDisease: LinkedDiseaseSummary | null;
  backlinks: AtlasBacklink[];
  templateTitle?: string | null;
}) {
  const t = useTranslations("myAtlas");
  const format = useFormatter();
  const [outline, setOutline] = useState<OutlineEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!page) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: the outline is read straight off the already-rendered DOM (querySelectorAll), inherently synchronous, not a value React itself owns
      setOutline([]);
      return;
    }
    const root = document.getElementById(`atlas-page-body-${page.id}`);
    if (!root) return;
    const headings = Array.from(root.querySelectorAll("h1, h2, h3"));
    const entries: OutlineEntry[] = headings.map((h, i) => {
      const id = `atlas-heading-${page.id}-${i}`;
      h.id = id;
      return { id, text: h.textContent ?? "", level: Number(h.tagName[1]) as 1 | 2 | 3 };
    });
    setOutline(entries);
    if (entries.length === 0) return;

    const observer = new IntersectionObserver(
      (entriesObserved) => {
        const visible = entriesObserved.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -70% 0px" }
    );
    headings.forEach((h) => observer.observe(h));
    return () => observer.disconnect();
    // page.body (not just page.id) — headings can change after a save
    // (editing mode) or a page swap, and the outline should refresh
    // either way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page?.id, page?.body]);

  if (!page) {
    return <aside className="hidden w-[250px] shrink-0 lg:block" />;
  }

  return (
    <aside className="hidden w-[250px] shrink-0 flex-col gap-5 overflow-y-auto border-border p-4 lg:flex lg:border-l">
      {outline.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="font-ui text-[9.5px] font-black tracking-[1.3px] text-secondary uppercase">{t("onThisPage")}</p>
          {outline.map((entry) => (
            <a
              key={entry.id}
              href={`#${entry.id}`}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(entry.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              style={{ paddingLeft: (entry.level - 1) * 10 }}
              className={`border-l-2 py-1 pl-2.5 font-ui text-xs transition-colors duration-base ${
                activeId === entry.id ? "border-accent font-bold text-acc-ink" : "border-border font-medium text-secondary hover:text-primary"
              }`}
            >
              {entry.text}
            </a>
          ))}
        </div>
      )}

      {linkedDisease && (
        <div className="rounded-xl border border-border p-3">
          <p className="font-ui text-xs font-bold text-navy">{t("fromLibrary")}</p>
          <p className="mt-0.5 font-ui text-[11.5px] font-semibold text-secondary">
            {linkedDisease.canonicalName}
            {linkedDisease.reviewedAt && (
              <> — {t("reviewedLabel", { date: format.dateTime(new Date(linkedDisease.reviewedAt), { year: "numeric", month: "short" }) })}</>
            )}
          </p>
          <Link href={`/conditions/${linkedDisease.slug}`} className="mt-2 block font-ui text-[11.5px] font-bold text-acc-ink">
            {t("openSourcePage")}
          </Link>
        </div>
      )}

      <div className="rounded-xl border border-border p-3">
        <p className="font-ui text-xs font-bold text-navy">{t("linkedFrom")}</p>
        {backlinks.length === 0 ? (
          <p className="mt-0.5 font-ui text-[11.5px] text-secondary">{t("noBacklinks")}</p>
        ) : (
          <div className="mt-1 flex flex-col gap-1">
            {backlinks.map((b) => (
              <p key={b.id} className="font-ui text-[11.5px] font-semibold text-secondary">
                {b.title || t("untitledPage")}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-surface-sunken p-3">
        <p className="font-ui text-xs font-bold text-navy">{t("templateLabel")}</p>
        <p className="mt-0.5 font-ui text-[11.5px] text-secondary">
          {templateTitle ? t("thisPageUsesTemplate", { template: templateTitle }) : t("notFromTemplate")}
        </p>
      </div>
    </aside>
  );
}
