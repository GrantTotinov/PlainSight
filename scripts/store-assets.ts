// Renders store images into store/assets/ from the built extension and two Google screenshots.
// Usage: pnpm build:chrome && pnpm store:assets
// Inputs: store/assets/google-before.png and google-after.png (1280 x 800, light theme, signed
// out, same query, before and after PlainSight). Take them by hand in a normal browser.
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';

const OUT = 'store/assets';
const EXT = resolve('.output/chrome-mv3');
const ICON = readFileSync('store/icon.svg', 'utf8');
const png = (file: string) => `data:image/png;base64,${readFileSync(file).toString('base64')}`;

const BASE_CSS = `
  * { box-sizing: border-box; margin: 0; }
  body { font-family: system-ui, 'Segoe UI', Roboto, sans-serif; color: #0b1f1d; }
  .brand { background: linear-gradient(135deg, #0f766e, #115e59); color: #fff; }
`;

async function render(page: Page, name: string, width: number, height: number, html: string) {
  await page.setViewportSize({ width, height });
  await page.setContent(`<!doctype html><style>${BASE_CSS}</style>${html}`);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png  ${width} x ${height}`);
}

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), 'plainsight-')), {
  channel: 'chromium',
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
try {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const id = new URL(sw.url()).host;
  await new Promise((r) => setTimeout(r, 500)); // let onInstalled finish
  await sw.evaluate(() =>
    chrome.storage.local.set({
      hiddenCount: 128,
      installedAt: Date.now(),
      reviewPromptDismissed: true,
    }),
  );
  const page = await ctx.newPage();
  await page.emulateMedia({ colorScheme: 'light' });

  // Raw captures of the extension's own pages.
  await page.setViewportSize({ width: 320, height: 600 });
  await page.goto(`chrome-extension://${id}/popup.html`);
  await page.waitForTimeout(400);
  const popup = await page.locator('main').screenshot({ scale: 'device' });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(`chrome-extension://${id}/welcome.html`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/3-welcome.png` });
  console.log(`${OUT}/3-welcome.png  1280 x 800`);

  const caption = (title: string, sub: string) =>
    `<h1 style="font-size:44px;line-height:1.15">${title}</h1><p style="font-size:22px;opacity:.85;margin-top:16px;line-height:1.4">${sub}</p>`;

  if (existsSync(`${OUT}/google-before.png`) && existsSync(`${OUT}/google-after.png`)) {
    // Left part of each screenshot (the results column), side by side and readable.
    const half = (file: string, label: string, accent: string) => `
      <div style="width:640px;height:800px;overflow:hidden;position:relative;border-right:1px solid #ddd">
        <div style="height:56px;display:flex;align-items:center;justify-content:center;font:600 22px system-ui;color:#fff;background:${accent}">${label}</div>
        <img src="${png(file)}" style="position:absolute;top:56px;left:-80px;width:1280px">
      </div>`;
    await render(
      page,
      '1-before-after',
      1280,
      800,
      `<div style="display:flex">${half(`${OUT}/google-before.png`, 'Without PlainSight', '#5b6570')}${half(`${OUT}/google-after.png`, 'With PlainSight', '#0f766e')}</div>`,
    );
  } else {
    console.log('Skipped 1-before-after.png: google-before.png / google-after.png missing.');
  }

  await render(
    page,
    '2-popup',
    1280,
    800,
    `<div class="brand" style="height:800px;display:flex;align-items:center;justify-content:center;gap:80px;padding:60px">
      <div style="max-width:520px">${caption('Switch modes or pause a tab in one click.', 'Hide AI keeps the normal page. Web only opens Google’s own Web filter: just links. Your counter never leaves your device.')}</div>
      <img src="data:image/png;base64,${popup.toString('base64')}" style="width:340px;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);background:#fff">
    </div>`,
  );

  await render(
    page,
    '4-privacy',
    1280,
    800,
    `<div class="brand" style="height:800px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:28px">
      <div style="width:120px;height:120px">${ICON}</div>
      <h1 style="font-size:56px">No data collected.</h1>
      <p style="font-size:28px;opacity:.9">No tracking. No remote code. Open source.</p>
    </div>`,
  );

  const tile = (w: number, h: number, scale: number) => `
    <div class="brand" style="width:${w}px;height:${h}px;display:flex;align-items:center;gap:${24 * scale}px;padding:0 ${36 * scale}px">
      <div style="width:${96 * scale}px;height:${96 * scale}px;flex:none;border-radius:${22 * scale}px;box-shadow:0 0 0 ${3 * scale}px rgba(255,255,255,.35)">${ICON}</div>
      <div><h1 style="font-size:${40 * scale}px">PlainSight</h1>
      <p style="font-size:${17 * scale}px;margin-top:${8 * scale}px;opacity:.92;line-height:1.35">Google results without AI Overviews and AI Mode</p></div>
    </div>`;
  await render(page, 'promo-small-440x280', 440, 280, tile(440, 280, 1));
  await render(page, 'promo-marquee-1400x560', 1400, 560, tile(1400, 560, 2.4));
  await render(
    page,
    'edge-logo-300',
    300,
    300,
    `<div style="width:300px;height:300px">${ICON}</div>`,
  );
  // Chrome Web Store icon: 96 x 96 artwork inside 128 x 128 with transparent padding.
  await page.setViewportSize({ width: 128, height: 128 });
  await page.setContent(
    `<style>html,body{margin:0;background:transparent}</style><div style="width:96px;height:96px;margin:16px">${ICON}</div>`,
  );
  await page.screenshot({ path: `${OUT}/store-icon-128.png`, omitBackground: true });
  console.log(`${OUT}/store-icon-128.png  128 x 128`);
} finally {
  await ctx.close();
}

// Callbacks passed to sw.evaluate run inside the extension service worker.
declare const chrome: typeof import('wxt/browser').browser;
