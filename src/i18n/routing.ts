import { defineRouting } from "next-intl/routing";
import { LOCALES, DEFAULT_LOCALE } from "./locales";

// localePrefix: "always" (not next-intl's default "as-needed") so
// every locale — including the default — carries an explicit URL
// prefix. "as-needed" hides the default locale's prefix, which would
// mean /conditions/x and /en/conditions/x are two different URLs for
// the same page (a real duplicate-content/revalidatePath headache),
// and the language switcher would need a special case for "already on
// the default, so don't add a prefix." Paying one redirect on `/` buys
// uniformity across every route and every revalidatePath call site.
export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "always",
});
