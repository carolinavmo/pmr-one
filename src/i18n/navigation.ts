import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// The one place locale-aware Link/redirect/router/pathname live —
// every call site that needs to navigate or link within the app
// imports from here instead of next/navigation directly, so a locale
// prefix is never something a component has to reason about by hand
// (string-surgery on a pathname is exactly the kind of thing that
// silently breaks the day a locale code appears as a path segment
// somewhere else).
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
