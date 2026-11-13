import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Messages = Record<string, { message: string; placeholders?: Record<string, unknown> }>;
const dir = 'public/_locales';
const load = (locale: string): Messages =>
  JSON.parse(readFileSync(`${dir}/${locale}/messages.json`, 'utf8'));
const en = load('en');
const locales = readdirSync(dir);
const PRIORITY = 'en ja ko zh_CN zh_TW de fr es pt_BR it pl nl tr ru uk vi id hi bg'.split(' ');

describe('locales', () => {
  it('covers the priority locales', () => {
    for (const l of PRIORITY) expect(locales).toContain(l);
  });

  describe.each(locales)('%s', (locale) => {
    const m = load(locale);

    it('respects store limits', () => {
      expect(m.extName?.message.length ?? 0).toBeLessThanOrEqual(75);
      expect(m.extDescription?.message.length ?? 0).toBeLessThanOrEqual(132);
      expect(m.extName?.message).toContain('PlainSight');
    });

    it('only uses keys that exist in English, with the same placeholders', () => {
      for (const [key, value] of Object.entries(m)) {
        expect(en, `unknown key ${key}`).toHaveProperty(key);
        for (const p of Object.keys(en[key]!.placeholders ?? {})) {
          expect(value.message).toContain('$' + p.toUpperCase() + '$');
        }
      }
    });

    it('has no em dashes in user-facing text', () => {
      for (const { message } of Object.values(m)) expect(message).not.toContain('—');
    });
  });
});
