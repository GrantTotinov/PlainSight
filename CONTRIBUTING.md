# Contributing

Thanks for helping. PlainSight has one job: removing AI features from Google Search. Changes outside that scope (ads, other sites, other modules) will likely be declined to keep the extension simple and easy to review.

## Reporting that something broke

Use the "Report a problem" button in the PlainSight popup, or the "Not working on my Google" issue form. Please include your Google domain and language and a screenshot. Do not post searches you consider private.

## Fixing selectors

Most breakages are Google changing its page. [docs/SELECTORS.md](docs/SELECTORS.md) explains how to capture a fixture, find the new structure and update `src/selectors/selectors.json`.

## Code

- TypeScript with `strict`. Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check` and `pnpm test` before opening a pull request.
- No network requests, analytics, remote config or remote code.
- No new dependencies without discussing them in an issue first.
- Bug fixes come as two commits: a test that fails first, then the fix.
- Branch names: `description-issuenumber`, for example `fix-paa-selector-12`.
- User-facing text: no em dashes. Use a colon, comma or hyphen.

## Translations

UI strings live in `public/_locales/<locale>/messages.json`. Use Google's own name for AI Overviews and AI Mode in your language, exactly as Google shows it. Strings marked `TODO(verify)` in their description still need a native check. Store limits: name 75 characters, description 132.
