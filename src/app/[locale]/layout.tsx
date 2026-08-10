import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AppShell } from "@/components/shell/AppShell";
import { isLocale, LOCALE_META } from "@/i18n/locales";
import "../globals.css";

// Back to a two-typeface split (reverting the brief Poppins-everywhere
// experiment): Inter for body text (`--font-ui`/`--font-reading`),
// Poppins kept only for `--font-heading` (disease title + section
// headings). Kept as three separate `next/font` calls so `--font-ui`/
// `--font-reading`/`--font-heading` stay independent design tokens
// components already reference by name.

// UI typeface (Tier 1: navigation, labels, buttons, badges, metadata)
const fontUI = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  weight: ["400", "500"],
});

// Reading typeface (Tier 1: clinical content — Overview, Definition,
// Clinical Pearls, algorithm text).
const fontReading = Inter({
  variable: "--font-reading",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  style: ["normal", "italic"],
});

// Disease page title + section headings (`font-heading`). Scoped to
// headings, not every body-text element — narrower than "every
// element in the app," matching DESIGN_SYSTEM.md's H1-H5 scale (this
// app currently only has real semantic uses for H1/H2; H3-H5 aren't
// wired to any component yet).
const fontHeading = Poppins({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "PM&R Atlas",
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
      className={`${fontUI.variable} ${fontReading.variable} ${fontHeading.variable} h-full scroll-smooth antialiased`}
    >
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
