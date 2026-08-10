// Relative, extensionless import — the convention every other file in
// this codebase uses, and the only spelling tsc/Next's bundler accepts
// without opting into `allowImportingTsExtensions`. Node's own ESM
// resolver requires an explicit extension on relative specifiers,
// which is why scripts/translate-one.mjs (run under plain `node`, no
// bundler) doesn't import this module directly — see the comment
// there.
import { LOCALE_META, type Locale } from "../../i18n/locales";

// Free-tier endpoint — a different host than the paid tier
// (api.deepl.com). Using the wrong one for a free-tier key 403s; it
// does not redirect, so this isn't a "just try the other one" bug to
// discover empirically, it's the documented split.
const DEEPL_API_BASE = "https://api-free.deepl.com/v2";

// DeepL's own hard limit on strings per /translate request.
const MAX_BATCH_SIZE = 50;

// Improves terminology register (favors clinical phrasing over
// colloquial) at no quota cost — DeepL's `context` param doesn't count
// against character usage the way the translated text itself does.
const CONTEXT =
  "Physical medicine and rehabilitation clinical reference for residents and physicians.";

// Free tier's real cap is 500k chars/month; budgeting under that
// leaves headroom for anything translated outside this app's own
// accounting (there is none today, but the margin costs nothing).
const DEFAULT_MONTHLY_BUDGET_CHARS = 400_000;

export class DeepLDisabledError extends Error {
  constructor() {
    super(
      "DeepL translation is disabled (DEEPL_ENABLED=false, or no DEEPL_API_KEY is configured)."
    );
    this.name = "DeepLDisabledError";
  }
}

export class DeepLAuthError extends Error {
  constructor() {
    super("DeepL rejected the API key (403) — check DEEPL_API_KEY is a valid free-tier key.");
    this.name = "DeepLAuthError";
  }
}

export class DeepLQuotaExceededError extends Error {
  constructor() {
    super(
      "DeepL monthly character quota exceeded (456) — translation is on cooldown for the rest of this UTC month."
    );
    this.name = "DeepLQuotaExceededError";
  }
}

export class DeepLBudgetExceededError extends Error {
  constructor(used: number, budget: number) {
    super(
      `Translating this batch would exceed the configured DeepL budget (${used} chars already used this month against a ${budget}-char budget).`
    );
    this.name = "DeepLBudgetExceededError";
  }
}

// Module-level circuit breaker once DeepL itself reports quota
// exhausted (HTTP 456) — without this, every subsequent save for the
// rest of the month would keep hammering an API that's already told
// us no, for zero benefit. Resets on server restart, which is fine:
// DeepL's own quota resets monthly regardless, this is just a local
// short-circuit in between so a restart can't make things worse, only
// re-check reality once.
let quotaCooldownUntil: number | null = null;

function isOnQuotaCooldown(): boolean {
  return quotaCooldownUntil !== null && Date.now() < quotaCooldownUntil;
}

function startQuotaCooldownToMonthEnd(): void {
  const now = new Date();
  quotaCooldownUntil = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
}

function apiKey(): string | undefined {
  return process.env.DEEPL_API_KEY;
}

// The kill-switch: local dev and seed-script reruns set
// DEEPL_ENABLED=false so an accidental save doesn't burn real quota.
// Missing altogether (no key configured yet) is treated the same way
// — there's nothing to call regardless of the flag.
export function isDeepLEnabled(): boolean {
  return process.env.DEEPL_ENABLED !== "false" && Boolean(apiKey());
}

async function deeplFetch(path: string, body?: URLSearchParams): Promise<Response> {
  const key = apiKey();
  if (!key) throw new DeepLDisabledError();
  return fetch(`${DEEPL_API_BASE}${path}`, {
    method: body ? "POST" : "GET",
    // Key sent as a header, never a URL param — a query string can end
    // up in a proxy/access log; a header is far less likely to.
    headers: {
      Authorization: `DeepL-Auth-Key ${key}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body,
  });
}

export interface DeepLUsage {
  characterCount: number;
  characterLimit: number;
}

export async function getUsage(): Promise<DeepLUsage> {
  const res = await deeplFetch("/usage");
  if (!res.ok) {
    if (res.status === 403) throw new DeepLAuthError();
    throw new Error(`DeepL /usage request failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { character_count: number; character_limit: number };
  return { characterCount: data.character_count, characterLimit: data.character_limit };
}

interface TranslateBatchOptions {
  // Rich-text fields (RichEditableText's sanitized HTML) need
  // tag_handling: "html" so DeepL translates the text nodes and
  // leaves the markup structure alone. Plain fields must NOT set
  // this — DeepL would otherwise try to interpret literal `<`/`>`
  // characters an author typed as markup.
  html?: boolean;
  monthlyBudgetChars?: number;
}

async function translateOneBatch(
  texts: string[],
  sourceLocale: Locale,
  targetLocale: Locale,
  html: boolean,
  attempt: number
): Promise<string[]> {
  const body = new URLSearchParams();
  for (const text of texts) body.append("text", text);
  body.set("source_lang", LOCALE_META[sourceLocale].deeplSource);
  body.set("target_lang", LOCALE_META[targetLocale].deeplTarget);
  body.set("preserve_formatting", "1");
  body.set("context", CONTEXT);
  if (html) body.set("tag_handling", "html");

  const res = await deeplFetch("/translate", body);

  if (res.ok) {
    const data = (await res.json()) as { translations: { text: string }[] };
    return data.translations.map((t) => t.text);
  }

  // Distinct handling per DeepL error code — these are not
  // interchangeable failures. A bad key or exhausted quota retrying
  // just wastes a round trip on an outcome that cannot change; a rate
  // limit or transient 5xx often resolves on a single retry.
  if (res.status === 403) throw new DeepLAuthError();

  if (res.status === 456) {
    startQuotaCooldownToMonthEnd();
    throw new DeepLQuotaExceededError();
  }

  if ((res.status === 429 || res.status >= 500) && attempt === 0) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return translateOneBatch(texts, sourceLocale, targetLocale, html, attempt + 1);
  }

  throw new Error(`DeepL /translate request failed: ${res.status} ${res.statusText}`);
}

// The one entry point this module exposes for actually translating
// text. Chunks into <=50-string batches (DeepL's hard per-request
// limit), checks live usage against the configured monthly budget
// before the first real request, and refuses outright if this process
// already knows (from an earlier 456 this month) that the quota is
// exhausted — no point spending a request to confirm what's already
// known.
export async function translateBatch(
  texts: string[],
  sourceLocale: Locale,
  targetLocale: Locale,
  options: TranslateBatchOptions = {}
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (!isDeepLEnabled()) throw new DeepLDisabledError();
  if (isOnQuotaCooldown()) throw new DeepLQuotaExceededError();

  const budget = options.monthlyBudgetChars ?? DEFAULT_MONTHLY_BUDGET_CHARS;
  const estimatedChars = texts.reduce((sum, text) => sum + text.length, 0);
  const usage = await getUsage();
  if (usage.characterCount + estimatedChars > budget) {
    throw new DeepLBudgetExceededError(usage.characterCount, budget);
  }

  const results: string[] = [];
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const chunk = texts.slice(i, i + MAX_BATCH_SIZE);
    const translated = await translateOneBatch(
      chunk,
      sourceLocale,
      targetLocale,
      options.html ?? false,
      0
    );
    results.push(...translated);
  }
  return results;
}
