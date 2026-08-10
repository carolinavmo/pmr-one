"use client";

import { useState } from "react";
// touch to force Turbopack file-watch pickup
import { Plus, X, Check, ChevronLeft, ChevronRight } from "lucide-react";
import type { TabsBlock } from "@/lib/editorial-blocks";
import { useEditMode } from "@/components/disease-page/EditMode";
import { updateTabsAction } from "@/lib/actions/authoring";
import { cardIcons, type CardIconName } from "@/components/ui/cardIcons";

type Tab = TabsBlock["tabs"][number];

function isCardIconName(value: string): value is CardIconName {
  return value in cardIcons;
}

const DEFAULT_ICON: CardIconName = "activity";

const emptyColumn = () => ({ title: "", items: [""] });
const emptyTab = (n: number): Tab => ({ label: `Phase ${n}`, columns: [emptyColumn()] });

// A phase/stage/option switcher (e.g. a rehab program's Phase 1-4) —
// owns-content, not a generic "tabs hold arbitrary blocks" container.
// Each tab is a small set of labeled checklists (`columns`), the same
// author-typed-list shape Comparison Table already uses, not free
// rich text — this stays a structured summary view, not a second way
// to write paragraphs.
export function TabsBlockView({
  block,
}: {
  block: TabsBlock;
}) {
  const { editing } = useEditMode();
  const [tabs, setTabs] = useState<Tab[]>(block.tabs);
  const [activeIndex, setActiveIndex] = useState(0);
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const commit = (next: Tab[]) => {
    setTabs(next);
    updateTabsAction(block.id, next);
  };

  const clampedIndex = Math.min(activeIndex, Math.max(tabs.length - 1, 0));
  const active = tabs[clampedIndex];

  const updateActive = (patch: Partial<Tab>) => {
    setTabs((current) =>
      current.map((t, i) => (i === clampedIndex ? { ...t, ...patch } : t))
    );
  };

  if (!editing) {
    if (tabs.length === 0) return null;
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap border-b border-border">
          {tabs.map((tab, index) => {
            const Icon = tab.icon && isCardIconName(tab.icon) ? cardIcons[tab.icon] : cardIcons[DEFAULT_ICON];
            const isActive = index === clampedIndex;
            return (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`flex items-center gap-2 border-b-2 px-4 py-3 text-left transition-colors duration-base ${
                  isActive ? "border-accent bg-accent/5" : "border-transparent hover:bg-border/20"
                }`}
              >
                <Icon
                  className={`size-5 shrink-0 ${isActive ? "text-accent" : "text-secondary"}`}
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span
                    className={`font-ui text-sm font-medium ${isActive ? "text-primary" : "text-secondary"}`}
                  >
                    {tab.label}
                  </span>
                  {tab.sublabel && (
                    <span className="font-ui text-xs text-secondary">{tab.sublabel}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {active && <TabContent tab={active} />}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-dashed border-border">
      <div className="flex flex-wrap items-center border-b border-border">
        {tabs.map((tab, index) => {
          const Icon = tab.icon && isCardIconName(tab.icon) ? cardIcons[tab.icon] : cardIcons[DEFAULT_ICON];
          const isActive = index === clampedIndex;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`group/tab relative flex items-center gap-2 border-b-2 px-4 py-3 text-left transition-colors duration-base ${
                isActive ? "border-accent bg-accent/5" : "border-transparent hover:bg-border/20"
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${isActive ? "text-accent" : "text-secondary"}`}
                aria-hidden="true"
              />
              <span className="flex flex-col">
                <span
                  className={`font-ui text-sm font-medium ${isActive ? "text-primary" : "text-secondary"}`}
                >
                  {tab.label || "Untitled tab"}
                </span>
                {tab.sublabel && (
                  <span className="font-ui text-xs text-secondary">{tab.sublabel}</span>
                )}
              </span>
              {tabs.length > 1 && (
                <span
                  role="button"
                  aria-label="Delete tab"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = tabs.filter((_, i) => i !== index);
                    commit(next);
                    setActiveIndex((current) => Math.min(current, next.length - 1));
                  }}
                  className="ml-1 hidden shrink-0 rounded p-0.5 text-secondary opacity-0 hover:bg-warning/10 hover:text-warning group-hover/tab:opacity-100 sm:block"
                >
                  <X className="size-3" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => {
            const next = [...tabs, emptyTab(tabs.length + 1)];
            commit(next);
            setActiveIndex(next.length - 1);
          }}
          className="flex items-center gap-1 self-stretch px-3 font-ui text-xs text-secondary hover:bg-border/20 hover:text-accent"
        >
          <Plus className="size-3.5" aria-hidden="true" />
          Tab
        </button>
      </div>

      {active && (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIconPickerOpen((open) => !open)}
                aria-label="Tab icon"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-surface-raised text-secondary hover:text-primary"
              >
                {(() => {
                  const Icon =
                    active.icon && isCardIconName(active.icon) ? cardIcons[active.icon] : cardIcons[DEFAULT_ICON];
                  return <Icon className="size-4" aria-hidden="true" />;
                })()}
              </button>
              {iconPickerOpen && (
                <div className="absolute top-10 left-0 z-10 grid w-48 grid-cols-6 gap-1 rounded-lg border border-border bg-surface-raised p-2 shadow-md">
                  {(Object.keys(cardIcons) as CardIconName[]).map((name) => {
                    const Icon = cardIcons[name];
                    return (
                      <button
                        key={name}
                        type="button"
                        title={name}
                        onClick={() => {
                          setIconPickerOpen(false);
                          const next = tabs.map((t, i) => (i === clampedIndex ? { ...t, icon: name } : t));
                          commit(next);
                        }}
                        className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-accent"
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <input
              value={active.label}
              placeholder="Tab label (e.g. Phase 1)"
              onChange={(e) => updateActive({ label: e.target.value })}
              onBlur={() => commit(tabs)}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 font-ui text-sm font-medium text-primary outline-none hover:border-border focus:border-accent"
            />
            <input
              value={active.sublabel ?? ""}
              placeholder="Sublabel (e.g. 0-2 Weeks)"
              onChange={(e) => updateActive({ sublabel: e.target.value })}
              onBlur={() => commit(tabs)}
              className="w-36 min-w-0 rounded border border-transparent bg-transparent px-1.5 py-1 font-ui text-sm text-secondary outline-none hover:border-border focus:border-accent"
            />
            {tabs.length > 1 && (
              <div className="flex shrink-0 gap-0.5">
                <button
                  type="button"
                  aria-label="Move tab left"
                  disabled={clampedIndex === 0}
                  onClick={() => {
                    const next = [...tabs];
                    [next[clampedIndex - 1], next[clampedIndex]] = [next[clampedIndex], next[clampedIndex - 1]];
                    commit(next);
                    setActiveIndex(clampedIndex - 1);
                  }}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                >
                  <ChevronLeft className="size-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Move tab right"
                  disabled={clampedIndex === tabs.length - 1}
                  onClick={() => {
                    const next = [...tabs];
                    [next[clampedIndex], next[clampedIndex + 1]] = [next[clampedIndex + 1], next[clampedIndex]];
                    commit(next);
                    setActiveIndex(clampedIndex + 1);
                  }}
                  className="flex size-7 items-center justify-center rounded text-secondary hover:bg-border/40 hover:text-primary disabled:opacity-30"
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <input
            value={active.title ?? ""}
            placeholder="Content header (optional) — e.g. Pain Management & Load Reduction"
            onChange={(e) => updateActive({ title: e.target.value })}
            onBlur={() => commit(tabs)}
            className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 font-ui text-sm text-secondary outline-none hover:border-border focus:border-accent"
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {active.columns.map((column, ci) => (
              <div key={ci} className="flex flex-col gap-2 rounded-md border border-border p-2">
                <div className="flex items-center gap-1">
                  <input
                    value={column.title}
                    placeholder="Column title (e.g. Goals)"
                    onChange={(e) =>
                      updateActive({
                        columns: active.columns.map((c, i) =>
                          i === ci ? { ...c, title: e.target.value } : c
                        ),
                      })
                    }
                    onBlur={() => commit(tabs)}
                    className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-ui text-sm font-semibold text-primary outline-none hover:border-border focus:border-accent"
                  />
                  {active.columns.length > 1 && (
                    <button
                      type="button"
                      aria-label="Delete column"
                      onClick={() =>
                        commit(
                          tabs.map((t, i) =>
                            i === clampedIndex
                              ? { ...t, columns: t.columns.filter((_, ci2) => ci2 !== ci) }
                              : t
                          )
                        )
                      }
                      className="shrink-0 rounded p-1 text-secondary hover:bg-warning/10 hover:text-warning"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
                <ul className="flex flex-col gap-1">
                  {column.items.map((item, ii) => (
                    <li key={ii} className="flex items-center gap-1">
                      <Check className="size-3.5 shrink-0 text-trust" aria-hidden="true" />
                      <input
                        value={item}
                        placeholder="Item"
                        onChange={(e) =>
                          updateActive({
                            columns: active.columns.map((c, i) =>
                              i === ci
                                ? { ...c, items: c.items.map((it, j) => (j === ii ? e.target.value : it)) }
                                : c
                            ),
                          })
                        }
                        onBlur={() => commit(tabs)}
                        className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 font-reading text-sm text-secondary outline-none hover:border-border focus:border-accent"
                      />
                      <button
                        type="button"
                        aria-label="Delete item"
                        onClick={() =>
                          commit(
                            tabs.map((t, i) =>
                              i === clampedIndex
                                ? {
                                    ...t,
                                    columns: t.columns.map((c, ci3) =>
                                      ci3 === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c
                                    ),
                                  }
                                : t
                            )
                          )
                        }
                        className="shrink-0 rounded p-1 text-secondary hover:bg-warning/10 hover:text-warning"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() =>
                    commit(
                      tabs.map((t, i) =>
                        i === clampedIndex
                          ? {
                              ...t,
                              columns: t.columns.map((c, ci4) =>
                                ci4 === ci ? { ...c, items: [...c.items, ""] } : c
                              ),
                            }
                          : t
                      )
                    )
                  }
                  className="flex w-fit items-center gap-1 rounded px-1.5 py-0.5 font-ui text-xs text-accent hover:bg-accent/10"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  Item
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                commit(
                  tabs.map((t, i) =>
                    i === clampedIndex ? { ...t, columns: [...t.columns, emptyColumn()] } : t
                  )
                )
              }
              className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-secondary hover:border-accent hover:text-accent"
            >
              <Plus className="size-4" aria-hidden="true" />
              <span className="font-ui text-xs">Column</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TabContent({ tab }: { tab: Tab }) {
  const header = tab.title ? `${tab.label}: ${tab.title}` : tab.label;
  return (
    <div className="p-3">
      {(tab.title || tab.sublabel) && (
        <h3 className="mb-3 font-ui text-base font-semibold text-primary">
          {header}
          {tab.sublabel && ` (${tab.sublabel})`}
        </h3>
      )}
      <div
        className={`grid gap-4 ${
          tab.columns.length >= 3 ? "sm:grid-cols-3" : tab.columns.length === 2 ? "sm:grid-cols-2" : ""
        }`}
      >
        {tab.columns.map((column, ci) => (
          <div key={ci} className="flex flex-col gap-2">
            {column.title && (
              <span className="font-ui text-sm font-semibold text-primary">{column.title}</span>
            )}
            <ul className="flex flex-col gap-1.5">
              {column.items
                .filter((item) => item)
                .map((item, ii) => (
                  <li key={ii} className="flex items-start gap-2 font-reading text-sm leading-6 text-secondary">
                    <Check className="mt-1 size-3.5 shrink-0 text-trust" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
