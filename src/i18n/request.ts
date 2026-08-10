import { getRequestConfig } from "next-intl/server";
import { isLocale, DEFAULT_LOCALE } from "./locales";

// Deep-merges the English message tree underneath whatever locale was
// requested, so a key that exists in en.json but hasn't been
// translated yet (or a whole namespace nobody's gotten to) renders the
// English string instead of next-intl throwing MISSING_MESSAGE at a
// reader. A half-translated UI is a cosmetic problem; a crashed page
// is not — and with three non-English message files that will always
// lag en.json by at least a little during normal editing, this
// fallback is load-bearing, not a nicety.
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>) {
  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(override)) {
    const baseValue = base[key];
    const overrideValue = override[key];
    if (
      baseValue &&
      overrideValue &&
      typeof baseValue === "object" &&
      typeof overrideValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(overrideValue)
    ) {
      merged[key] = deepMerge(baseValue as Record<string, unknown>, overrideValue as Record<string, unknown>);
    } else {
      merged[key] = overrideValue;
    }
  }
  return merged;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : DEFAULT_LOCALE;

  const en = (await import(`../messages/en.json`)).default;
  const messages = locale === "en" ? en : deepMerge(en, (await import(`../messages/${locale}.json`)).default);

  return { locale, messages };
});
