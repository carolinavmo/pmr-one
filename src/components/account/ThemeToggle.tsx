"use client";

import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "pmr-theme";

const OPTIONS: { value: ThemePreference; Icon: typeof Sun }[] = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
];

// Same useSyncExternalStore-over-localStorage pattern as SidebarFrame's
// collapse toggle — the sanctioned way to read a browser-only value
// without a hydration mismatch (getServerSnapshot always returns
// "system", matching what the blocking script in layout.tsx leaves in
// place when nothing is stored) or an effect-body setState (flagged by
// this repo's react-hooks/set-state-in-effect lint rule).
let listeners: (() => void)[] = [];

function subscribe(onChange: () => void) {
  listeners.push(onChange);
  return () => {
    listeners = listeners.filter((listener) => listener !== onChange);
  };
}

function getSnapshot(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

function choose(next: ThemePreference) {
  if (next === "system") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.removeItem(STORAGE_KEY);
  } else {
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem(STORAGE_KEY, next);
  }
  for (const listener of listeners) listener();
}

export function ThemeToggle({
  groupLabel,
  optionLabels,
}: {
  groupLabel: string;
  optionLabels: Record<ThemePreference, string>;
}) {
  const pref = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="group"
      aria-label={groupLabel}
      className="inline-flex w-fit rounded-full border border-border bg-surface-raised p-1"
    >
      {OPTIONS.map(({ value, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => choose(value)}
          aria-pressed={pref === value}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 font-ui text-sm transition-colors duration-base ${
            pref === value
              ? "bg-accent text-white"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Icon className="size-4" aria-hidden="true" />
          {optionLabels[value]}
        </button>
      ))}
    </div>
  );
}
