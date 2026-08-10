// Diagnostic CLI for DeepL — not part of the real translation pipeline
// (that's Phase C's job, via src/lib/i18n/deepl.ts inside the actual
// app), just a way to translate one real string and look at the
// result before anything in the schema or UI depends on the answer.
//
// Deliberately self-contained (doesn't import src/lib/i18n/deepl.ts)
// — same reason every other script in this directory duplicates
// rather than cross-imports app code: Node's ESM resolver requires an
// explicit file extension on relative specifiers, which Next's
// bundler doesn't, so a shared relative-import chain can't satisfy
// both `tsc`/Next and plain `node` at once without the app code itself
// carrying a Node-only spelling it doesn't otherwise need. This is a
// small, deliberate duplication of the request-building logic, not a
// drift risk — the two are unlikely to need to change in lockstep.
//
// The one open question this exists to settle empirically: does
// DeepL's PT->PT-BR request actually perform Portugal->Brazil variant
// conversion, or does it near-no-op since DeepL's *source* side only
// has one generic PT? Run it both ways and read the output — don't
// assume.
//
// Usage:
//   node scripts/translate-one.mjs "<text>" <to-locale> [from-locale] [--html]
//
// Examples:
//   node scripts/translate-one.mjs "Aplique gelo durante 15 minutos." pt-br pt-pt
//   node scripts/translate-one.mjs "<p>Aplique <strong>gelo</strong>.</p>" pt-br pt-pt --html
import { config } from "dotenv";

config({ path: ".env.local" });

const DEEPL_API_BASE = "https://api-free.deepl.com/v2";
const CONTEXT = "Physical medicine and rehabilitation clinical reference for residents and physicians.";

// Mirrors src/i18n/locales.ts's LOCALE_META deeplSource/deeplTarget
// fields — kept in sync by hand, same as the header comment explains.
const DEEPL_CODES = {
  en: { source: "EN", target: "EN-GB" },
  "pt-pt": { source: "PT", target: "PT-PT" },
  "pt-br": { source: "PT", target: "PT-BR" },
  es: { source: "ES", target: "ES" },
};

const args = process.argv.slice(2).filter((arg) => arg !== "--html");
const html = process.argv.includes("--html");
const [text, to, from = "pt-pt"] = args;

if (!text || !to) {
  console.error(
    "Usage: node scripts/translate-one.mjs \"<text>\" <to-locale> [from-locale] [--html]"
  );
  process.exitCode = 1;
} else if (!DEEPL_CODES[to] || !DEEPL_CODES[from]) {
  console.error(`Locale must be one of: en, pt-pt, pt-br, es. Got to=${to} from=${from}.`);
  process.exitCode = 1;
} else if (!process.env.DEEPL_API_KEY) {
  console.error(
    "DEEPL_API_KEY is not set in .env.local — nothing to call. This script is expected to fail this way until a real key is configured (see LESSONS_LEARNED.md Phase B entry)."
  );
  process.exitCode = 1;
} else {
  console.log(`Source (${from}):     ${text}`);

  const body = new URLSearchParams();
  body.append("text", text);
  body.set("source_lang", DEEPL_CODES[from].source);
  body.set("target_lang", DEEPL_CODES[to].target);
  body.set("preserve_formatting", "1");
  body.set("context", CONTEXT);
  if (html) body.set("tag_handling", "html");

  try {
    const res = await fetch(`${DEEPL_API_BASE}/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!res.ok) {
      console.error(`DeepL request failed: ${res.status} ${res.statusText}`);
      process.exitCode = 1;
    } else {
      const data = await res.json();
      console.log(`Translated (${to}):  ${data.translations[0].text}`);
    }
  } catch (error) {
    console.error(`Translation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
