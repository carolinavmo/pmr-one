import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Server Actions default to a 1MB request body cap — well under the
  // 8MB MAX_UPLOAD_BYTES both authoring.ts (illustrations) and
  // dashboard-hero.ts (hero background) already enforce themselves, so
  // without this every upload over ~1MB was silently rejected by
  // Next.js before either handler's own size check ever ran.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

// Points at src/i18n/request.ts by default (that's next-intl's own
// convention for where getRequestConfig lives) — wires the plugin's
// webpack/turbopack alias so every Server Component can resolve
// `next-intl/server`'s request config without each one importing it
// by hand.
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
