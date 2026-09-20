import type { Metadata } from "next";
import { Roboto } from "next/font/google";
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
// Roboto doesn't ship a 600 weight (only 100/300/400/500/700/900) —
// the brief's "Meta 600" role uses 500 here as the nearest available
// step below 700, not an exact match.

const fontUI = Roboto({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const fontReading = Roboto({
  variable: "--font-reading",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const fontHeading = Roboto({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const fontSectionHeading = Roboto({
  variable: "--font-section-heading",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

// Brand wordmark only ("PM&R Explained" in TopBar.tsx) — 900 per
// DESIGN-BRIEF.md's explicit logo spec (22px/900, sentence case, navy
// + teal split).
const fontBrand = Roboto({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["900"],
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
