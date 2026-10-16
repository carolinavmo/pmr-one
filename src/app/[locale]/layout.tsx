import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AppShell } from "@/components/shell/AppShell";
import { isLocale, LOCALE_META } from "@/i18n/locales";
import "../globals.css";

// DESIGN-BRIEF.md: "Type — Roboto only," most roles at weight 900.
// Replaces the prior five-typeface split (Inter/Assistant/Poppins/
// Caveat Brush/Yanone Kaffeesatz) — including the Caveat Brush
// section-heading experiment deployed earlier this session, and the
// even-earlier "Poppins-everywhere" attempt this file used to warn
// against reverting from. Kept as five separate `next/font` calls
// (same font, different `variable`) so `--font-ui`/`--font-reading`/
// `--font-heading`/`--font-section-heading`/`--font-brand` stay
// independent tokens — every existing component already references
// them by name, so no component needs to change which variable it
// uses, only what that variable now resolves to.
//
// Self-hosted (src/fonts: Roboto latin subset, OFL-1.1, from @fontsource/roboto)
// instead of next/font/google — the Google Fonts download at build time failed
// on Railway's builder and blocked every deploy. Same weights per token as before.
//
// Roboto doesn't ship a 600 weight (only 100/300/400/500/700/900) —
// the brief's "Meta 600" role uses 500 here as the nearest available
// step below 700, not an exact match.

const fontUI = localFont({
  variable: "--font-ui",
  display: "swap",
  src: [
    { path: "../../fonts/roboto-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/roboto-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/roboto-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/roboto-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
});

const fontReading = localFont({
  variable: "--font-reading",
  display: "swap",
  src: [
    { path: "../../fonts/roboto-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/roboto-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../../fonts/roboto-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
});

const fontHeading = localFont({
  variable: "--font-heading",
  display: "swap",
  src: [
    { path: "../../fonts/roboto-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/roboto-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/roboto-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
});

const fontSectionHeading = localFont({
  variable: "--font-section-heading",
  display: "swap",
  src: [
    { path: "../../fonts/roboto-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../../fonts/roboto-latin-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../../fonts/roboto-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
});

// Brand wordmark only ("PM&R Explained" in TopBar.tsx) — 900 per
// DESIGN-BRIEF.md's explicit logo spec (22px/900, sentence case, navy
// + teal split).
const fontBrand = localFont({
  variable: "--font-brand",
  display: "swap",
  src: [
    { path: "../../fonts/roboto-latin-900-normal.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "PM&R Explained",
  description:
    "A fast, expert-curated MSK exam and injection reference for PM&R residents.",
};

// setRequestLocale (next-intl's static-rendering opt-in) is
// deliberately not called here — every page in this app calls auth()
// (reads cookies), which already makes the whole tree dynamic, so
// setRequestLocale would be ceremony with no effect. If a future page
// ever goes fully static, this is the place to reconsider it.
export default async function RootLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  // The proxy only ever forwards the four known prefixes, so this
  // should be unreachable in practice — kept as a real guard (not an
  // assertion) since layout.tsx can't trust its own params blindly,
  // same defense-in-depth reasoning the rest of this app's authoring
  // actions already apply.
  if (!isLocale(locale)) notFound();

  const messages = await getMessages();

  return (
    <html
      lang={LOCALE_META[locale].bcp47}
      className={`${fontUI.variable} ${fontReading.variable} ${fontHeading.variable} ${fontSectionHeading.variable} ${fontBrand.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Runs before hydration so a stored light/dark override
            (ThemeToggle.tsx, /account) applies before first paint —
            without this, the page would flash the OS-default theme
            for a frame whenever the stored preference disagrees with
            it. Inline and synchronous is the only way to beat paint;
            "system" (no override) intentionally leaves nothing in
            storage, so this script simply does nothing that day. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('pmr-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-surface text-primary font-ui">
        {/* Required even before any component calls useTranslations() —
            next-intl's Client Component Link/usePathname/useRouter
            (@/i18n/navigation, already used by several "use client"
            files) read the current locale via this context and throw
            "No intl context found" without it. Locale/messages are
            picked up automatically from the current request config
            (src/i18n/request.ts) since neither is passed explicitly. */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <AppShell>{children}</AppShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
