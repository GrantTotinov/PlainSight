import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import type { SelectorConfig } from '../src/lib/hide';
import {
  CHECKED_KEY,
  pickConfig,
  refreshRemote,
  REMOTE_KEY,
  REMOTE_URL,
  validateConfig,
} from '../src/lib/remote';
import bundledJson from '../src/selectors/selectors.json';

// The validator keeps only fields PlainSight uses, so compare without the human "notes".
const bundled = Object.fromEntries(
  Object.entries(bundledJson).filter(([key]) => key !== 'notes'),
) as unknown as SelectorConfig;
const clone = (): SelectorConfig => structuredClone(bundled);
const withSelector = (selector: string) => {
  const c = clone();
  c.rules[0]!.selectors.push(selector);
  return c;
};

describe('validateConfig', () => {
  it('accepts the bundled config unchanged', () => {
    expect(validateConfig(bundled)).toEqual(bundled);
  });

  it.each([
    ['a CSS rule break', 'div { background: url(https://evil.example) } x'],
    ['a closing brace', 'div}body'],
    ['a declaration separator', 'div;color:red'],
    ['an at-rule', '@import url(x)'],
    ['an escape', 'div\\7b'],
    ['a comment', 'div/**/'],
    ['markup', '<script>'],
    ['a control character', 'div\u0000'],
    ['an oversized selector', 'a'.repeat(201)],
  ])('rejects a selector with %s', (_, selector) => {
    expect(validateConfig(withSelector(selector))).toBeNull();
  });

  it.each([
    ['not an object', 'selectors'],
    ['another schema version', { ...clone(), schemaVersion: 2 }],
    ['a bad date', { ...clone(), updated: 'tomorrow' }],
    ['too many rules', { ...clone(), rules: Array(51).fill(clone().rules[0]) }],
    [
      'no AI Overview rule',
      { ...clone(), rules: clone().rules.filter((r) => r.feature !== 'aiOverview') },
    ],
    ['no AI Mode rule', { ...clone(), rules: clone().rules.filter((r) => r.feature !== 'aiMode') }],
    [
      'a bad rule id',
      { ...clone(), rules: [{ ...clone().rules[0]!, id: 'Bad Id!' }, ...clone().rules] },
    ],
    ['a non-string selector', { ...clone(), rules: [{ ...clone().rules[0]!, selectors: [42] }] }],
  ])('rejects %s', (_, raw) => {
    expect(validateConfig(raw)).toBeNull();
  });

  it('drops rules for features this version does not know', () => {
    const c = clone() as unknown as { rules: Record<string, unknown>[] };
    c.rules.push({ id: 'future', feature: 'somethingNew', selectors: ['.x'] });
    expect(validateConfig(c)?.rules.map((r) => r.id)).toEqual(bundled.rules.map((r) => r.id));
  });

  it('drops unknown fields', () => {
    const c = {
      ...clone(),
      extra: 'x',
      rules: [{ ...clone().rules[0]!, extra: 1 }, ...clone().rules.slice(1)],
    };
    const valid = validateConfig(c)!;
    expect(valid).not.toHaveProperty('extra');
    expect(valid.rules[0]).not.toHaveProperty('extra');
  });
});

describe('pickConfig', () => {
  it('uses a valid remote config only when it is newer', () => {
    const newer = { ...clone(), updated: '2999-01-01' };
    expect(pickConfig(bundled, newer)).toEqual(newer);
    expect(pickConfig(bundled, { ...clone(), updated: '2000-01-01' })).toBe(bundled);
    expect(pickConfig(bundled, clone())).toBe(bundled);
    expect(pickConfig(bundled, { ...withSelector('a{}'), updated: '2999-01-01' })).toBe(bundled);
    expect(pickConfig(bundled, undefined)).toBe(bundled);
  });
});

describe('refreshRemote', () => {
  beforeEach(() => {
    fakeBrowser.reset();
    vi.restoreAllMocks();
  });

  const respond = (body: unknown, ok = true) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, json: async () => body } as Response);

  it('downloads without credentials or referrer and stores a valid config', async () => {
    const newer = { ...clone(), updated: '2999-01-01' };
    const fetch = respond(newer);
    await refreshRemote(1000);
    expect(fetch).toHaveBeenCalledWith(
      REMOTE_URL,
      expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
    );
    expect(new URL(REMOTE_URL).search).toBe('');
    expect((await fakeBrowser.storage.local.get(REMOTE_KEY))[REMOTE_KEY]).toEqual(newer);
  });

  it('checks at most once a day', async () => {
    const fetch = respond(clone());
    await refreshRemote(1000);
    await refreshRemote(1000 + 60 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(1);
    await refreshRemote(1000 + 25 * 60 * 60 * 1000);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('keeps the old config when the download is invalid or fails', async () => {
    await fakeBrowser.storage.local.set({ [REMOTE_KEY]: 'previous' });
    respond({ schemaVersion: 1, rules: [] });
    await refreshRemote(1000);
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    await fakeBrowser.storage.local.remove(CHECKED_KEY);
    await refreshRemote(1000);
    respond(clone(), false);
    await fakeBrowser.storage.local.remove(CHECKED_KEY);
    await refreshRemote(1000);
    expect((await fakeBrowser.storage.local.get(REMOTE_KEY))[REMOTE_KEY]).toBe('previous');
  });
});
