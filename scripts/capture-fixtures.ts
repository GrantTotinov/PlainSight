// Saves Google pages as test fixtures. Run on your own machine, never in CI.
//   pnpm fixtures:capture            all locales
//   pnpm fixtures:capture de ja      only these locales
// A real (headed) browser with a persistent profile in .playwright-profile/ is used, so you
// can click through the EU consent page once and it stays accepted or rejected.
// Review every new file before committing: fixtures are public.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

// Questions that usually trigger an AI Overview, per Google UI language.
const QUERIES: Record<string, string[]> = {
  en: ['how do airplanes fly', 'why is the sky blue'],
  de: ['wie fliegen flugzeuge', 'warum ist der himmel blau'],
  ja: ['飛行機はなぜ飛ぶ', '空はなぜ青い'],
  ko: ['비행기는 어떻게 나나요', '하늘은 왜 파란가요'],
  es: ['cómo vuelan los aviones', 'por qué el cielo es azul'],
  'pt-BR': ['como os aviões voam', 'por que o céu é azul'],
  bg: ['как летят самолетите', 'защо небето е синьо'],
};
const PAUSE_MS = 6000; // keep the request rate low

const locales = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(QUERIES);
const ctx = await chromium.launchPersistentContext('.playwright-profile', {
  channel: 'chromium',
  headless: false,
  viewport: { width: 1280, height: 900 },
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

for (const locale of locales) {
  const queries = QUERIES[locale];
  if (!queries) throw new Error(`No queries for locale "${locale}"`);
  const dir = `test/fixtures/${locale}`;
  mkdirSync(dir, { recursive: true });
  const pages: [string, string][] = [
    ['homepage', `https://www.google.com/?hl=${locale}`],
    ...queries.map((q, i): [string, string] => [
      `query-${i + 1}`,
      `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=${locale}`,
    ]),
    [
      'results-web-filter',
      `https://www.google.com/search?q=${encodeURIComponent(queries[0]!)}&hl=${locale}&udm=14`,
    ],
  ];
  for (const [name, url] of pages) {
    await page.goto(url);
    if (new URL(page.url()).pathname.startsWith('/sorry')) {
      console.log('Google is showing a captcha. Stop here and try again later.');
      await ctx.close();
      process.exit(1);
    }
    await page.waitForTimeout(PAUSE_MS); // AI Overviews stream in after load
    const { html, hasAiOverview } = await page.evaluate(sanitize);
    const file = name.startsWith('query')
      ? `${hasAiOverview ? 'results-ai-overview' : 'results-no-ai'}-${name.slice(6)}`
      : name;
    writeFileSync(`${dir}/${file}.html`, html);
    console.log(`${locale}/${file}.html  (${Math.round(html.length / 1024)} KB)`);
  }
}
await ctx.close();
console.log('Done. Check the AI Overview heading text per locale in src/selectors/selectors.json.');

// Runs in the page. Drops scripts, styles, tracking parameters and the location footer.
function sanitize() {
  const doc = document.documentElement.cloneNode(true) as HTMLElement;
  doc
    .querySelectorAll('script, noscript, style, link, iframe, #footcnt, [role="contentinfo"]')
    .forEach((e) => e.remove());
  doc.querySelectorAll('[src^="data:"]').forEach((e) => e.setAttribute('src', ''));
  doc.querySelectorAll('[style*="data:"]').forEach((e) => e.removeAttribute('style'));
  const noisy = [
    'data-ved',
    'data-hveid',
    'ping',
    'data-fbs',
    'jsdata',
    'data-ctx-provider',
    'data-ctx-cb-provider',
  ];
  doc.querySelectorAll('*').forEach((e) => noisy.forEach((a) => e.removeAttribute(a)));
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href')!;
    a.setAttribute(
      'href',
      href.replace(/([?&](?:sca_esv|sxsrf|ved|ei|sei|fbs|uds|gsessionid|url)=)[^&]*/g, '$1x'),
    );
  });
  const html =
    '<!doctype html>\n' + doc.outerHTML.replace(/\b([a-z]{2})-[A-Z]{2}\b(?=["&])/g, '$1');
  return { html, hasAiOverview: !!document.querySelector('#eKIzJc, .M8OgIe') };
}
