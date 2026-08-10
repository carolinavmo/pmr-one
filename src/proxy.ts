import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

// Next.js 16 renamed the middleware.ts convention to proxy.ts (same
// behavior, new filename/export name) — using the new name from the
// start rather than the deprecated one. next-intl's own middleware
// factory is otherwise unchanged; it reads the request's Accept-
// Language header and NEXT_LOCALE cookie, redirects a bare path to
// its locale-prefixed form, and rewrites already-prefixed requests
// through to the matching [locale] route.
export const proxy = createMiddleware(routing);

export const config = {
  // Runs on every route except: API handlers (locale-agnostic route
  // handlers, no [locale] segment), Next's own internals, and any
  // request for a file with an extension (images, fonts, etc. served
  // from /public) — none of those should ever get a locale prefix.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
