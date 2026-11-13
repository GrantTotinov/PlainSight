// @vitest-environment happy-dom
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import {
  blockFor,
  createHider,
  HIDDEN_ATTR,
  KEEP_ATTR,
  visibleText,
  type SelectorConfig,
} from '../src/lib/hide';
import rawConfig from '../src/selectors/selectors.json';

const config = rawConfig as SelectorConfig;
const FIXTURES = resolve('test/fixtures');
const known = config.rules.flatMap((r) => r.selectors);

function load(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const onHidden = vi.fn();
  const hider = createHider(doc, config, onHidden);
  hider.setEnabled(true);
  return { doc, hider, onHidden };
}

const isHidden = (el: Element) => {
  for (let e: Element | null = el; e; e = e.parentElement) {
    if (e.hasAttribute(HIDDEN_ATTR)) return true;
    if (!e.hasAttribute(KEEP_ATTR) && known.some((s) => e.matches(s))) return true;
  }
  return false;
};

const aiHeading = (doc: Document) =>
  [...doc.querySelectorAll('[role="heading"]')].find((h) => visibleText(h) === 'AI Overview');

const fixtures = readdirSync(FIXTURES, { recursive: true, encoding: 'utf8' })
  .filter((f) => f.endsWith('.html'))
  .map((f) => [f.replace(/\\/g, '/'), readFileSync(join(FIXTURES, f), 'utf8')] as const);

describe('fixtures', () => {
  it('has fixtures to test against', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  describe.each(fixtures)('%s', (name, html) => {
    it('keeps every organic result and the results column visible', () => {
      const { doc } = load(html);
      for (const title of doc.querySelectorAll('a h3')) expect(isHidden(title)).toBe(false);
      for (const id of ['search', 'rso', 'center_col', 'rcnt']) {
        const el = doc.getElementById(id);
        if (el) expect(isHidden(el)).toBe(false);
      }
      for (const el of doc.querySelectorAll(`[${HIDDEN_ATTR}]`)) {
        expect(el.querySelectorAll('a h3').length).toBe(0);
      }
    });

    it('hides the AI Overview when the page has one', () => {
      const { doc, onHidden } = load(html);
      const heading = aiHeading(doc);
      if (!name.includes('ai-overview')) {
        expect(heading).toBeUndefined();
        expect(onHidden).not.toHaveBeenCalled();
        return;
      }
      expect(heading && isHidden(heading)).toBe(true);
      expect(onHidden).toHaveBeenCalledTimes(1);
      // Guards are a last resort: on real pages the hidden block should be found cleanly.
      expect(doc.querySelector(`[${KEEP_ATTR}]`)).toBeNull();
    });

    it('hides AI Mode entry points and keeps the other tabs', () => {
      const { doc } = load(html);
      for (const a of doc.querySelectorAll('a[href*="udm=50"]')) expect(isHidden(a)).toBe(true);
      for (const a of doc.querySelectorAll('[role="listitem"] a[href*="udm=2"]')) {
        expect(isHidden(a)).toBe(false);
      }
      const visibleAiMode = [...doc.querySelectorAll('a, button, [role="button"], [role="link"]')]
        .filter((el) => visibleText(el) === 'AI Mode')
        .filter((el) => !isHidden(el));
      expect(visibleAiMode).toEqual([]);
    });
  });

  it('keeps the homepage search box usable', () => {
    const html = fixtures.find(([n]) => n === 'en/homepage.html')![1];
    const { doc } = load(html);
    expect(isHidden(doc.querySelector('form[role="search"] button[role="link"]')!)).toBe(true);
    expect(isHidden(doc.querySelector('form[role="search"]')!)).toBe(false);
    expect(isHidden(doc.querySelector('textarea, input[name="q"]')!)).toBe(false);
  });
});

describe('safety guards', () => {
  const html = (body: string) => `<!doctype html><html><body>${body}</body></html>`;
  const results =
    '<a href="https://a.example"><h3>A</h3></a><a href="https://b.example"><h3>B</h3></a>';

  it('never hides a known selector that wraps several results', () => {
    const { doc, onHidden } = load(
      html(`<div id="rso"><div class="M8OgIe">${results}</div></div>`),
    );
    const block = doc.querySelector('.M8OgIe')!;
    expect(block.hasAttribute(KEEP_ATTR)).toBe(true);
    expect(isHidden(block)).toBe(false);
    expect(onHidden).not.toHaveBeenCalled();
  });

  it('stops climbing before a container with results', () => {
    const { doc } = load(
      html(
        `<div id="rso"><div id="wrap"><div id="aio"><div role="heading">AI Overview</div><p>text</p></div>${results}</div></div>`,
      ),
    );
    expect(doc.getElementById('aio')!.hasAttribute(HIDDEN_ATTR)).toBe(true);
    expect(isHidden(doc.getElementById('wrap')!)).toBe(false);
  });

  it('ignores a result whose title is "AI Overview"', () => {
    const { doc } = load(
      html(
        `<div id="rso"><div><a href="https://x.example"><h2 role="heading">AI Overview</h2></a></div></div>`,
      ),
    );
    expect(doc.querySelector(`[${HIDDEN_ATTR}]`)).toBeNull();
  });

  it('never hides the results containers themselves', () => {
    const doc = new DOMParser().parseFromString(
      html('<div id="search"><div role="heading">AI Overview</div></div>'),
      'text/html',
    );
    expect(blockFor(doc.querySelector('[role="heading"]')!)).toBe(
      doc.querySelector('[role="heading"]'),
    );
  });

  it('reads button text without inline styles', () => {
    const { doc } = load(
      html(
        '<form role="search"><div><button class="x"><style>.x{color:red}</style><span>AI Mode</span></button></div></form>',
      ),
    );
    expect(doc.querySelector('button')!.hasAttribute(HIDDEN_ATTR)).toBe(true);
  });
});

describe('createHider', () => {
  it('hides blocks that stream in after load and counts once per page', async () => {
    const onHidden = vi.fn();
    const hider = createHider(document, config, onHidden);
    document.body.innerHTML = '<div role="main"><div id="center_col"></div></div>';
    hider.start();
    hider.setEnabled(true);
    const block = document.createElement('div');
    block.innerHTML = '<div><div role="heading">AI Overview</div><p>Generated text</p></div>';
    document.querySelector('[role="main"]')!.prepend(block);
    await vi.waitFor(() => expect(block.hasAttribute(HIDDEN_ATTR)).toBe(true));
    const again = block.cloneNode(true) as Element;
    again.removeAttribute(HIDDEN_ATTR);
    document.querySelector('[role="main"]')!.prepend(again);
    await vi.waitFor(() => expect(again.hasAttribute(HIDDEN_ATTR)).toBe(true));
    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it('does not count while disabled and turns the CSS off', () => {
    const onHidden = vi.fn();
    document.body.innerHTML = '<div role="main"><div class="M8OgIe">AI</div></div>';
    const hider = createHider(document, config, onHidden);
    hider.start();
    hider.setEnabled(false);
    expect(onHidden).not.toHaveBeenCalled();
    const style = [...document.querySelectorAll('style')].at(-1)!;
    expect(style.textContent).toBe('');
  });
});

describe('selectors.json', () => {
  it('is valid', () => {
    expect(config.schemaVersion).toBe(1);
    expect(config.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Set(config.rules.map((r) => r.id)).size).toBe(config.rules.length);
    for (const r of config.rules) {
      expect(['aiOverview', 'aiMode']).toContain(r.feature);
      for (const s of r.selectors) expect(() => document.querySelector(s)).not.toThrow();
      for (const texts of Object.values({ ...r.headingText, ...r.buttonText })) {
        expect(texts.every((t) => t.trim() === t && t.length > 0)).toBe(true);
      }
    }
  });
});
