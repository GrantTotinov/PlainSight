import { describe, expect, it } from 'vitest';
import { browserName, reportUrl, reviewUrl, shouldAskForReview } from '../src/lib/links';

describe('reportUrl', () => {
  it('only carries version, browser, mode and language', () => {
    const url = new URL(
      reportUrl({ version: '1.2.3', browser: 'Chrome 142', mode: 'webOnly', language: 'de' }),
    );
    expect(url.origin + url.pathname).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/new$/);
    expect([...url.searchParams.keys()].sort()).toEqual(
      ['browser', 'language', 'mode', 'template', 'version'].sort(),
    );
    expect(url.searchParams.get('browser')).toBe('Chrome 142');
  });

  it('never contains a URL or a search query', () => {
    const href = reportUrl({
      version: '1',
      browser: 'Firefox 140',
      mode: 'hideAi',
      language: 'en-US',
    });
    const query = new URL(href).search;
    expect(query).not.toMatch(/https?%3A|https?:|[?&]q=|google\./i);
  });

  it('truncates oversized values', () => {
    const url = new URL(
      reportUrl({ version: 'x'.repeat(500), browser: '', mode: '', language: '' }),
    );
    expect(url.searchParams.get('version')).toHaveLength(40);
  });
});

describe('browserName', () => {
  const ua =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0';
  it('keeps only the browser and major version', () => {
    expect(browserName('chrome', ua)).toBe('Chrome 142');
    expect(browserName('edge', ua)).toBe('Edge 142');
    expect(
      browserName(
        'firefox',
        'Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0',
      ),
    ).toBe('Firefox 140');
    expect(browserName('firefox', '')).toBe('Firefox');
  });
});

describe('reviewUrl', () => {
  it('points to the store of the current browser', () => {
    expect(reviewUrl('chrome', 'abc')).toBe('https://chromewebstore.google.com/detail/abc/reviews');
    expect(reviewUrl('edge', 'abc')).toContain('microsoftedge.microsoft.com');
    expect(reviewUrl('firefox', 'x@y')).toContain('addons.mozilla.org');
  });
});

describe('shouldAskForReview', () => {
  const day = 24 * 60 * 60 * 1000;
  const now = 100 * day;
  it('waits for real use and respects dismissal', () => {
    expect(
      shouldAskForReview(
        { hiddenCount: 20, installedAt: now - 7 * day, reviewPromptDismissed: false },
        now,
      ),
    ).toBe(true);
    expect(
      shouldAskForReview(
        { hiddenCount: 19, installedAt: now - 30 * day, reviewPromptDismissed: false },
        now,
      ),
    ).toBe(false);
    expect(
      shouldAskForReview(
        { hiddenCount: 500, installedAt: now - 6 * day, reviewPromptDismissed: false },
        now,
      ),
    ).toBe(false);
    expect(
      shouldAskForReview(
        { hiddenCount: 500, installedAt: now - 30 * day, reviewPromptDismissed: true },
        now,
      ),
    ).toBe(false);
  });
});
