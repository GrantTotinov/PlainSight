// End-to-end check of the built Chrome extension in Playwright's Chromium.
// Google pages are served from test/fixtures, so this sends no traffic to Google.
// Usage: pnpm build:chrome && pnpm e2e   (add --headed to watch)
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

// Callbacks passed to sw.evaluate run inside the extension service worker.
declare const chrome: typeof import('wxt/browser').browser;

const EXT = resolve('.output/chrome-mv3');
const fixture = (name: string) => readFileSync(`test/fixtures/en/${name}.html`, 'utf8');
// The query picks the fixture: /search?q=<fixture name>
const search = (name: string, extra = '') =>
  `https://www.google.com/search?q=${name}&hl=en${extra}`;

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'plainsight-')), {
  channel: 'chromium',
  headless: !process.argv.includes('--headed'),
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const requested: string[] = [];
// A "newer" selector config for the remote update check: the bundled one plus #botstuff.
const remoteConfig = JSON.parse(readFileSync('src/selectors/selectors.json', 'utf8'));
remoteConfig.updated = '2999-01-01';
remoteConfig.rules[1].selectors.push('#botstuff');
const remoteRequests: { url: string; cookie?: string; referer?: string }[] = [];

await ctx.route('**/*', (route) => {
  const url = new URL(route.request().url());
  if (url.hostname === 'raw.githubusercontent.com') {
    const headers = route.request().headers();
    remoteRequests.push({ url: url.href, cookie: headers.cookie, referer: headers.referer });
    return route.fulfill({ status: 200, contentType: 'application/json', json: remoteConfig });
  }
  if (url.hostname !== 'www.google.com' || route.request().resourceType() !== 'document') {
    return route.abort();
  }
  requested.push(url.href);
  const name = url.pathname === '/' ? 'homepage' : (url.searchParams.get('q') ?? '');
  const body = /^[a-z0-9-]+$/.test(name) ? fixture(name) : '<h1>unknown fixture</h1>';
  return route.fulfill({ status: 200, contentType: 'text/html', body });
});

const results: string[] = [];
const check = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    results.push(`PASS  ${name}`);
  } catch (err) {
    results.push(`FAIL  ${name}\n      ${(err as Error).message.split('\n')[0]}`);
  }
};
const udm = (page: Page) => new URL(page.url()).searchParams.get('udm');

try {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const setSettings = async (mode: string, blockAiMode: boolean, hidePeopleAlsoAsk = false) => {
    await sw.evaluate((s) => chrome.storage.sync.set({ settings: { schemaVersion: 1, ...s } }), {
      mode,
      blockAiMode,
      hidePeopleAlsoAsk,
    });
    await new Promise((r) => setTimeout(r, 300)); // background rebuilds the DNR rules
  };
  const page = await ctx.newPage();
  const open = async (url: string) => {
    await page.goto(url);
    await page.waitForTimeout(300);
  };

  await check('welcome page opens on install', async () => {
    for (let i = 0; i < 20 && !ctx.pages().some((p) => p.url().endsWith('/welcome.html')); i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.ok(ctx.pages().some((p) => p.url().endsWith('/welcome.html')));
  });

  for (const name of [
    'results-ai-overview',
    'results-ai-overview-2',
    'results-ai-overview-inline',
  ]) {
    await check(`Hide AI: ${name}`, async () => {
      await open(search(name));
      const aio = page.locator('[role="heading"]').filter({ hasText: /^AI Overview$/ });
      assert.ok((await aio.count()) > 0, 'fixture has no AI Overview heading');
      assert.equal(await aio.first().isVisible(), false, 'AI Overview heading is visible');
      assert.equal(
        await page.locator('a[href*="udm=50"]').first().isVisible(),
        false,
        'AI Mode tab visible',
      );
      assert.ok(await page.locator('a[href*="udm=2"]').first().isVisible(), 'Images tab hidden');
      const titles = page.locator('a h3');
      assert.equal(
        await titles.filter({ visible: true }).count(),
        await titles.count(),
        'an organic result is hidden',
      );
    });
  }

  await check('Hide AI: counter counts once per page', async () => {
    const { hiddenCount } = await sw.evaluate(() => chrome.storage.local.get('hiddenCount'));
    assert.equal(hiddenCount, 3);
  });

  await check('Hide AI: homepage AI Mode button hidden, search box visible', async () => {
    await open('https://www.google.com/');
    assert.equal(await page.locator('form[role="search"] button[role="link"]').isVisible(), false);
    assert.ok(await page.locator('textarea[name="q"]').isVisible());
  });

  await check('Hide AI: page status reaches the popup', async () => {
    await open(search('results-ai-overview'));
    const status = await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.google.com/search*' });
      return chrome.tabs.sendMessage(tab!.id!, { type: 'pageStatus' });
    });
    assert.deepEqual(status, { overviewHidden: true, kept: 0 });
  });

  await check('"Show it on this page" reveals until the next page load', async () => {
    await open(search('results-ai-overview'));
    const aio = page
      .locator('[role="heading"]')
      .filter({ hasText: /^AI Overview$/ })
      .first();
    assert.equal(await aio.isVisible(), false);
    const status = await sw.evaluate(async () => {
      const [tab] = await chrome.tabs.query({ url: 'https://www.google.com/search*' });
      return chrome.tabs.sendMessage(tab!.id!, { type: 'reveal' });
    });
    assert.deepEqual(status, { overviewHidden: false, kept: 0 });
    assert.ok(await aio.isVisible(), 'still hidden after reveal');
    await page.reload();
    await page.waitForTimeout(300);
    assert.equal(await aio.isVisible(), false, 'still visible after reload');
  });

  await check('Keyboard shortcut is registered (Alt+Shift+H)', async () => {
    const commands = await sw.evaluate(() => chrome.commands.getAll());
    const toggle = commands.find((c) => c.name === 'toggle-tab');
    assert.ok(toggle, 'command missing');
    assert.equal(toggle.shortcut, 'Alt+Shift+H', JSON.stringify(toggle));
  });

  await check('Hide AI: an AI Mode page opened on purpose is left alone', async () => {
    await open(search('results-ai-overview', '&udm=50'));
    assert.equal(udm(page), '50');
    const aio = page.locator('[role="heading"]').filter({ hasText: /^AI Overview$/ });
    assert.equal(await aio.first().isVisible(), true, 'AI content hidden on the AI Mode page');
  });

  await check('Block AI Mode in Hide AI: udm=50 goes to regular results', async () => {
    await setSettings('hideAi', true);
    await open(search('results-ai-overview', '&udm=50'));
    assert.equal(udm(page), null, page.url());
  });

  await check('Web only: plain search gets udm=14', async () => {
    await setSettings('webOnly', true);
    await open(search('results-web-filter'));
    assert.equal(udm(page), '14', page.url());
  });

  await check("Web only: Images, News, Jobs and I'm Feeling Lucky are left alone", async () => {
    await open(search('results-web-filter', '&udm=2'));
    assert.equal(udm(page), '2', page.url());
    for (const extra of ['&tbm=nws', '&ibp=htl;jobs', '&btnI=1']) {
      await open(search('results-web-filter', extra));
      assert.equal(udm(page), null, page.url());
    }
  });

  await check('Web only + Block AI Mode: udm=50 goes to the Web filter', async () => {
    await open(search('results-web-filter', '&udm=50'));
    assert.equal(udm(page), '14', page.url());
  });

  await check('Web only: "Show full Google results" pauses the tab', async () => {
    await open(search('results-web-filter'));
    const link = page.locator('#plainsight-full-results');
    assert.ok(await link.isVisible(), 'link not shown');
    await link.click();
    await page.waitForURL((u) => !u.searchParams.has('udm'));
    await page.waitForTimeout(300);
    assert.equal(udm(page), null, page.url());
    await page.reload();
    assert.equal(udm(page), null, 'paused tab was redirected after reload');
    assert.ok(
      await page.locator('a[href*="udm=50"]').first().isVisible(),
      'paused tab still hides',
    );
  });

  await check('Pause is per tab: another tab still redirects', async () => {
    const other = await ctx.newPage();
    await other.goto(search('results-web-filter'));
    assert.equal(udm(other), '14', other.url());
    await other.close();
  });

  await check('Pause is cleared when the tab closes', async () => {
    await page.close();
    await new Promise((r) => setTimeout(r, 300));
    const rules = await sw.evaluate(() => chrome.declarativeNetRequest.getSessionRules());
    assert.equal(rules.length, 0);
  });

  await check('Option: "People also ask" hidden only while turned on', async () => {
    const p = await ctx.newPage();
    await setSettings('hideAi', false, true);
    await p.goto(search('results-ai-overview-2'));
    const paa = p
      .locator('[role="heading"]')
      .filter({ hasText: /^People also ask$/ })
      .first();
    const videos = p
      .locator('[role="heading"]')
      .filter({ hasText: /^Videos$/ })
      .first();
    assert.equal(await paa.isVisible(), false, 'People also ask visible while on');
    assert.ok(await videos.isVisible(), 'Videos hidden');
    await setSettings('hideAi', false, false);
    assert.ok(await paa.isVisible(), 'People also ask still hidden after turning it off');
    await p.close();
  });

  await check('Mode switch applies to an open page without reload', async () => {
    const p = await ctx.newPage();
    await setSettings('hideAi', false);
    await p.goto(search('results-ai-overview'));
    const aio = p
      .locator('[role="heading"]')
      .filter({ hasText: /^AI Overview$/ })
      .first();
    assert.equal(await aio.isVisible(), false);
    await setSettings('off', false);
    assert.equal(await aio.isVisible(), true, 'still hidden after switching Off');
    await setSettings('hideAi', false);
    assert.equal(await aio.isVisible(), false, 'visible after switching back on');
    await p.close();
  });

  await check('Remote update: downloaded rules apply to an open page', async () => {
    await setSettings('hideAi', false);
    const p = await ctx.newPage();
    await p.goto(search('results-ai-overview'));
    const bottom = p.locator('#botstuff');
    // Force the daily check (the install-time one may have run before routing was ready).
    await sw.evaluate(() => chrome.storage.local.remove(['remoteCheckedAt', 'remoteSelectors']));
    await p.reload();
    for (let i = 0; i < 30 && (await bottom.isVisible()); i++) await p.waitForTimeout(100);
    if (await bottom.isVisible()) {
      const stored = await sw.evaluate(() => chrome.storage.local.get('remoteSelectors'));
      const state = await bottom.evaluate((el) => [...el.attributes].map((a) => a.name).join(' '));
      assert.fail(
        `not applied: requests=${remoteRequests.length} stored=${JSON.stringify(stored).slice(0, 60)} attrs=${state}`,
      );
    }
    const last = remoteRequests.at(-1)!;
    assert.equal(new URL(last.url).search, '', 'query string sent');
    assert.equal(last.cookie, undefined, 'cookie sent');
    assert.equal(last.referer, undefined, 'referrer sent');
    await p.close();
  });

  await check('Remote update: turning it off drops the downloaded rules', async () => {
    await sw.evaluate(() =>
      chrome.storage.sync.set({
        settings: { schemaVersion: 1, mode: 'hideAi', blockAiMode: false, remoteUpdates: false },
      }),
    );
    await new Promise((r) => setTimeout(r, 300));
    const p = await ctx.newPage();
    await p.goto(search('results-ai-overview'));
    assert.ok(await p.locator('#botstuff').isVisible(), 'remote rule still applied');
    const { remoteSelectors } = await sw.evaluate(() =>
      chrome.storage.local.get('remoteSelectors'),
    );
    assert.equal(remoteSelectors, undefined);
    await p.close();
  });

  await check('Off: nothing is hidden or redirected', async () => {
    await setSettings('off', true);
    const p = await ctx.newPage();
    await p.goto(search('results-ai-overview', '&udm=50'));
    assert.equal(udm(p), '50', p.url());
    assert.ok(
      await p.locator('a[href*="udm=50"]').first().isVisible(),
      'AI Mode tab hidden while Off',
    );
    await p.close();
  });

  await check('no request ever left for a host other than the fixture server', async () => {
    assert.ok(requested.every((u) => u.startsWith('https://www.google.com/')));
  });
} finally {
  console.log(results.join('\n'));
  await ctx.close();
}
process.exitCode = results.some((r) => r.startsWith('FAIL')) ? 1 : 0;
