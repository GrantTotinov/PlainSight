import { describe, expect, it } from 'vitest';
import type { Browser } from 'wxt/browser';
import { SEARCH_HOSTS } from '../src/lib/hosts';
import { buildRules, pauseRule, pauseRuleId, RULE_ID } from '../src/lib/rules';
import { DEFAULT_SETTINGS, type Settings } from '../src/lib/settings';

type Rule = Browser.declarativeNetRequest.Rule;

/**
 * Minimal model of DNR matching for top-level navigations: highest priority wins,
 * allow beats redirect on ties, requestDomains also match subdomains.
 * Returns the URL the browser would end up loading.
 */
function navigate(rules: Rule[], url: string, tabId = 1): string {
  for (let hops = 0; hops < 5; hops++) {
    const u = new URL(url);
    const match = rules
      .filter(({ condition: c }) => {
        if (c.tabIds && !c.tabIds.includes(tabId)) return false;
        if (
          c.requestDomains &&
          !c.requestDomains.some((d) => u.hostname === d || u.hostname.endsWith(`.${d}`))
        )
          return false;
        return !c.regexFilter || new RegExp(c.regexFilter, 'i').test(url);
      })
      .sort(
        (a, b) => (b.priority ?? 1) - (a.priority ?? 1) || (a.action.type === 'allow' ? -1 : 1),
      )[0];
    if (!match || match.action.type === 'allow') return url;
    const q = match.action.redirect!.transform!.queryTransform!;
    for (const key of q.removeParams ?? []) u.searchParams.delete(key);
    for (const { key, value } of q.addOrReplaceParams ?? []) u.searchParams.set(key, value);
    if (u.href === url) throw new Error(`redirect loop on ${url}`);
    url = u.href;
  }
  throw new Error(`too many redirects for ${url}`);
}

const webOnly: Settings = { mode: 'webOnly', blockAiMode: false };
const g = 'https://www.google.com/search?q=cats';

describe('buildRules', () => {
  it('adds nothing when PlainSight is off, even with Block AI Mode on', () => {
    expect(buildRules({ mode: 'off', blockAiMode: true })).toEqual([]);
  });

  it('adds nothing in Hide AI mode without Block AI Mode', () => {
    expect(buildRules(DEFAULT_SETTINGS)).toEqual([]);
  });

  it('opens plain searches in the Web filter', () => {
    const rules = buildRules(webOnly);
    expect(navigate(rules, g)).toBe(`${g}&udm=14`);
    expect(navigate(rules, 'https://www.google.de/search?q=katzen&hl=de')).toBe(
      'https://www.google.de/search?q=katzen&hl=de&udm=14',
    );
  });

  it.each([
    ['Images', `${g}&udm=2`],
    ['Web', `${g}&udm=14`],
    ['AI Mode', `${g}&udm=50`],
    ['News', `${g}&tbm=nws`],
    ['Shopping', 'https://www.google.com/search?tbm=shop&q=cats'],
    ['tab param first', 'https://www.google.com/search?udm=7&q=cats'],
  ])('keeps the tab the user picked: %s', (_, url) => {
    expect(navigate(buildRules(webOnly), url)).toBe(url);
  });

  it.each([
    'https://news.google.com/search?q=cats',
    'https://www.google.com/maps/search/cats',
    'https://www.google.com/?q=cats',
    'https://www.google.com/webhp',
    'https://www.example.com/search?q=cats',
    'https://www.google.com/search?q=cats%26udm%3D2',
  ])('does not touch other pages: %s', (url) => {
    const rules = buildRules({ mode: 'webOnly', blockAiMode: true });
    const expected = url.endsWith('%3D2') ? `${url}&udm=14` : url;
    expect(navigate(rules, url)).toBe(expected);
  });

  it('only matches main_frame requests on www Google Search hosts', () => {
    for (const r of buildRules({ mode: 'webOnly', blockAiMode: true })) {
      expect(r.condition.resourceTypes).toEqual(['main_frame']);
      expect(r.condition.requestDomains).toEqual(SEARCH_HOSTS);
    }
    expect(SEARCH_HOSTS).toContain('www.google.com');
    expect(SEARCH_HOSTS).toContain('www.google.co.jp');
    expect(SEARCH_HOSTS).toContain('www.google.bg');
    expect(SEARCH_HOSTS.every((h) => /^www\.google(\.[a-z]{2,3}){1,2}$/.test(h))).toBe(true);
  });

  it('Block AI Mode sends AI Mode to regular results in Hide AI mode', () => {
    const rules = buildRules({ mode: 'hideAi', blockAiMode: true });
    expect(navigate(rules, `${g}&udm=50`)).toBe(g);
    expect(navigate(rules, 'https://www.google.com/search?udm=50&q=cats')).toBe(g);
    expect(navigate(rules, `${g}&udm=500`)).toBe(`${g}&udm=500`);
    expect(navigate(rules, `${g}&udm=2`)).toBe(`${g}&udm=2`);
  });

  it('Block AI Mode sends AI Mode to the Web filter in Web only mode', () => {
    const rules = buildRules({ mode: 'webOnly', blockAiMode: true });
    expect(navigate(rules, `${g}&udm=50`)).toBe(`${g}&udm=14`);
  });

  it('orders priorities: block AI Mode > keep tab choice > add Web filter', () => {
    const byId = Object.fromEntries(
      buildRules({ mode: 'webOnly', blockAiMode: true }).map((r) => [r.id, r.priority]),
    );
    expect(byId[RULE_ID.blockAiMode]).toBeGreaterThan(byId[RULE_ID.keepTabChoice]!);
    expect(byId[RULE_ID.keepTabChoice]).toBeGreaterThan(byId[RULE_ID.addWebFilter]!);
  });

  it('uses unique IDs and regexes under the 2 KB limit', () => {
    const rules = buildRules({ mode: 'webOnly', blockAiMode: true });
    expect(new Set(rules.map((r) => r.id)).size).toBe(rules.length);
    for (const r of rules) expect(r.condition.regexFilter!.length).toBeLessThan(2048);
  });
});

describe('pauseRule', () => {
  it('lets a paused tab load anything, other tabs are unaffected', () => {
    const rules = [...buildRules({ mode: 'webOnly', blockAiMode: true }), pauseRule(7)];
    expect(navigate(rules, g, 7)).toBe(g);
    expect(navigate(rules, `${g}&udm=50`, 7)).toBe(`${g}&udm=50`);
    expect(navigate(rules, g, 8)).toBe(`${g}&udm=14`);
  });

  it('never collides with dynamic rule IDs', () => {
    expect(pauseRuleId(0)).toBeGreaterThan(Math.max(...Object.values(RULE_ID)));
    expect(pauseRule(0).priority).toBeGreaterThan(3);
  });
});
