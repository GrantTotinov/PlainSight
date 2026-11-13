// Remote selector updates: a daily download of selectors.json from the public GitHub repo, so
// selector fixes reach users without waiting for store review. Data only, never code. Nothing
// about the user is sent: no cookies, no referrer, no query string, no identifiers.
import type { Feature, SelectorConfig, SelectorRule } from './hide';

export const REMOTE_URL =
  'https://raw.githubusercontent.com/GrantTotinov/PlainSight/main/src/selectors/selectors.json';
export const REMOTE_KEY = 'remoteSelectors';
export const CHECKED_KEY = 'remoteCheckedAt';
const DAY = 24 * 60 * 60 * 1000;

const FEATURES: readonly Feature[] = ['aiOverview', 'aiMode', 'peopleAlsoAsk'];
// Characters that could close a CSS rule or start another one. Selectors never need them.
const UNSAFE_SELECTOR = /[{};@\\<>]|\/\*|\p{Cc}/u;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

function strings(
  v: unknown,
  max: number,
  maxLength: number,
  ok: (s: string) => boolean = () => true,
) {
  if (!Array.isArray(v) || v.length > max) return null;
  const out = v.filter((s): s is string => typeof s === 'string' && s.length > 0);
  if (out.length !== v.length) return null;
  return out.every((s) => s.length <= maxLength && ok(s)) ? out : null;
}

function texts(v: unknown): Record<string, string[]> | undefined | null {
  if (v === undefined) return undefined;
  if (!isObject(v) || Object.keys(v).length > 60) return null;
  const out: Record<string, string[]> = {};
  for (const [locale, list] of Object.entries(v)) {
    const clean = strings(list, 5, 60, (s) => !/\p{Cc}/u.test(s) && s.trim() === s);
    if (!/^[a-zA-Z-]{2,10}$/.test(locale) || !clean) return null;
    out[locale] = clean;
  }
  return out;
}

/**
 * Checks a downloaded config and returns a clean copy, or null if anything is off.
 * Rules for features this version does not know are dropped, not rejected.
 */
export function validateConfig(raw: unknown): SelectorConfig | null {
  if (!isObject(raw) || raw.schemaVersion !== 1) return null;
  if (typeof raw.updated !== 'string' || !DATE.test(raw.updated)) return null;
  if (!Array.isArray(raw.rules) || raw.rules.length > 50) return null;

  const rules: SelectorRule[] = [];
  for (const r of raw.rules) {
    if (!isObject(r) || typeof r.id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(r.id)) return null;
    if (!FEATURES.includes(r.feature as Feature)) continue; // from a newer version
    const selectors = strings(r.selectors, 30, 200, (s) => !UNSAFE_SELECTOR.test(s));
    const headingText = texts(r.headingText);
    const buttonText = texts(r.buttonText);
    if (!selectors || headingText === null || buttonText === null) return null;
    if (r.optional !== undefined && typeof r.optional !== 'boolean') return null;
    rules.push({
      id: r.id,
      feature: r.feature as Feature,
      selectors,
      ...(r.optional && { optional: true }),
      ...(headingText && { headingText }),
      ...(buttonText && { buttonText }),
    });
  }
  // A config that cannot find AI Overviews or AI Mode is broken, whatever it says.
  for (const core of ['aiOverview', 'aiMode'] as const) {
    if (!rules.some((r) => r.feature === core && r.selectors.length > 0)) return null;
  }
  return { schemaVersion: 1, updated: raw.updated, rules };
}

/** The remote config only wins when it is valid and newer than the one in the package. */
export function pickConfig(bundled: SelectorConfig, remote: unknown): SelectorConfig {
  const valid = validateConfig(remote);
  return valid && valid.updated > bundled.updated ? valid : bundled;
}

/** Background only. Downloads the config at most once a day and stores it if it is valid. */
export async function refreshRemote(now = Date.now()): Promise<void> {
  const { [CHECKED_KEY]: checkedAt } = await browser.storage.local.get(CHECKED_KEY);
  if (typeof checkedAt === 'number' && now - checkedAt < DAY && checkedAt <= now) return;
  await browser.storage.local.set({ [CHECKED_KEY]: now });
  try {
    const res = await fetch(REMOTE_URL, {
      cache: 'no-cache',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return;
    const config = validateConfig(await res.json());
    if (config) await browser.storage.local.set({ [REMOTE_KEY]: config });
  } catch {
    // Offline, blocked or invalid JSON: keep whatever we had.
  }
}

/** Forget the downloaded config, for when the user turns remote updates off. */
export const clearRemote = () => browser.storage.local.remove([REMOTE_KEY, CHECKED_KEY]);
