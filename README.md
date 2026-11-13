# PlainSight

Remove AI Overviews and AI Mode from Google Search. Get classic web results back.
Free, open source, no tracking.

<!-- TODO: before/after screenshots -->

## Install

- Chrome Web Store: coming soon
- Microsoft Edge Add-ons: coming soon
- Firefox Add-ons: coming soon

## What it does

PlainSight has three modes. You pick one on the welcome page and can switch any time from the toolbar button.

- **Hide AI** (default): the normal Google results page, without the AI Overview block and without AI Mode buttons and tabs, on the results page and on the Google homepage. Optional: **Block AI Mode** sends AI Mode back to regular results.
- **Web only**: every search opens in Google's own **Web** filter (`udm=14`). It shows links only. Because the filter runs on Google's servers, it keeps working when Google changes its page layout. Images, maps and other modules are not shown in this view. A small "Show full Google results" link at the top of the results takes you to the full page for that tab.
- **Off**: PlainSight does nothing.

Options:

- **Hide "People also ask"** (off by default): Google now answers almost every "People also ask" question with AI, so this hides the whole box.
- **Block AI Mode** (off by default): opening AI Mode takes you to regular results instead. Without it, an AI Mode page you open on purpose (for example from the browser's own AI Mode button) is left as it is.

You can also pause PlainSight on a single tab from the toolbar button. The pause ends when you close the tab. The popup tells you when it hid an AI Overview on the current page, and warns you if something looked like AI but was left visible for safety.

## How it works

- **Web only** uses `declarativeNetRequest`: plain searches on Google Search domains get `udm=14` added before the page loads. If you already picked a tab or vertical (Images, News, Web, AI Mode, Jobs, I'm Feeling Lucky, anything with `udm`, `tbm`, `ibp` or `btnI`), PlainSight leaves it alone. It does not change your default search engine.
- **Hide AI** uses a small content script. It injects CSS before the page renders, so AI blocks do not flash, and watches for blocks that Google streams in later. It finds AI blocks in five independent ways, so one Google change does not break it: known selectors, the heading text in 19 languages (tolerant of small rewording), the AI Mode link and button labels, accessibility labels that mention the AI Overview, and AI Mode links inside the block. Every one of them goes through the same safety checks: a hidden block never contains a regular search result or the results column. See [docs/SELECTORS.md](docs/SELECTORS.md).
- If Google ever changes the page so much that Hide AI misses something, **Web only** keeps working, because the filter runs on Google's side.

## Privacy

PlainSight collects no data. There are no analytics, no remote code and no network requests of its own. Settings are stored in your browser (and synced by your browser if you use browser sync). The "AI Overviews hidden" counter stays on your device. See [PRIVACY.md](PRIVACY.md).

Permissions:

- `storage`: save your settings.
- `declarativeNetRequestWithHostAccess` and access to Google Search domains: add the Web filter to searches and hide AI blocks. PlainSight runs on nothing else.

## Known limitations

- The AI Mode button in Chrome's own interface (address bar, new tab page) is part of the browser, not of the web page. Extensions cannot change it.
- Chrome on Android does not support extensions.
- Firefox for Android: Web only works. Hide AI uses selectors from the desktop page and may miss AI blocks on Google's mobile layout.
- PlainSight only removes AI features. It does not hide ads, "Discussions", shopping or other modules.
- When Google puts something else inside the AI Overview (for example a dictionary card or spelling help), it is hidden together with the AI Overview. Use Pause on this tab or Web only if you need it.
- Selectors for languages other than English still need to be checked on real pages (marked `TODO(verify)` in `src/selectors/selectors.json`).

## Development

Requirements: Node.js 22.18 or newer (24 recommended) and pnpm.

```sh
pnpm install
pnpm dev              # Chrome with hot reload
pnpm dev:firefox      # Firefox (MV3)
pnpm test             # unit and fixture tests
pnpm build            # Chrome, Edge and Firefox builds in .output/
pnpm build:chrome; pnpm e2e   # built extension in Chromium against saved Google pages
pnpm zip              # store zips plus the Firefox sources zip
```

Other scripts: `pnpm domains:update` refreshes the list of Google domains, `pnpm fixtures:capture` saves Google pages as test fixtures (run on your own machine, never in CI), `pnpm store:assets` renders the store screenshots and promo tiles into `store/assets/`.

### Building from source (for add-on reviewers)

```sh
pnpm install --frozen-lockfile
pnpm build:firefox
```

The add-on is in `.output/firefox-mv3`. The build uses WXT (Vite) and Preact, with no code generation beyond bundling.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

Google Search is a trademark of Google LLC. PlainSight is not affiliated with Google.
