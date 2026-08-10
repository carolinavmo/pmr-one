// One table, four consumers: the URL segment (next-intl's routing),
// the <html lang> attribute, the DeepL request codes (once the
// translation pipeline lands), and the language switcher's labels.
// Kept lowercase and hyphenated because that's the only form that is
// simultaneously a safe URL segment, a safe filename (src/messages/*.json),
// and a safe Postgres literal (disease.source_locale, once that column
// exists) — the BCP-47 casing (pt-PT) is derived here, once, rather
// than being a second identifier some call site has to keep in sync.
export const LOCALES = ["en", "pt-pt", "pt-br", "es"] as const;
export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

interface LocaleMeta {
  bcp47: string; // <html lang>, hreflang
  nativeName: string; // language-switcher panel — always the language's own name for itself
  shortLabel: string; // language-switcher trigger
  deeplTarget: string; // DeepL target_lang, once the translation pipeline lands
  deeplSource: string; // DeepL source_lang — no regional variant on the source side
}

export const LOCALE_META: Record<Locale, LocaleMeta> = {
  en: { bcp47: "en-GB", nativeName: "English", shortLabel: "EN", deeplTarget: "EN-GB", deeplSource: "EN" },
  "pt-pt": {
    bcp47: "pt-PT",
    nativeName: "Português (Portugal)",
    shortLabel: "PT",
    deeplTarget: "PT-PT",
    deeplSource: "PT",
  },
  "pt-br": {
    bcp47: "pt-BR",
    nativeName: "Português (Brasil)",
    shortLabel: "PT-BR",
    deeplTarget: "PT-BR",
    deeplSource: "PT",
  },
  es: { bcp47: "es-ES", nativeName: "Español", shortLabel: "ES", deeplTarget: "ES", deeplSource: "ES" },
};

// All five existing live diseases were authored in English, and `en`
// is the sanest landing locale for a visitor whose browser sends no
// recognized Accept-Language. Independent of AUTHORING_LOCALE below —
// the founder authors new content in Portuguese, but a first-time
// visitor from anywhere should still land on English by default.
export const DEFAULT_LOCALE: Locale = "en";

// The founder's own going-forward authoring language — new diseases
// default disease.source_locale to this once the translation-content
// migration lands.
export const AUTHORING_LOCALE: Locale = "pt-pt";
