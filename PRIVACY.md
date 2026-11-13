# PlainSight privacy policy

_Last updated: 2026-11-13_

PlainSight does not collect, store or send any personal data.

## What PlainSight stores

- **Your settings** (mode and options). They are saved with your browser's extension storage. If you use your browser's sync feature, your browser syncs them between your devices like any other extension setting.
- **A counter** of how many AI Overviews were hidden, the install date, and whether you dismissed the review prompt. These stay on your device and are only shown to you in the PlainSight popup.
- **The latest hiding rules** downloaded from GitHub (see below), kept in extension storage on your device.

## The one connection PlainSight makes

Once a day, PlainSight downloads its list of hiding rules from this public file:
https://raw.githubusercontent.com/GrantTotinov/PlainSight/main/src/selectors/selectors.json

- The request carries no cookies, no referrer, no query string and no identifier. It does not include anything about you, your searches or the pages you visit.
- Like any download, it reaches GitHub's servers, which see your IP address. GitHub's own privacy policy applies to that: https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement
- The file contains data only (CSS selectors and heading texts). PlainSight checks it strictly before use and never runs code from it.
- You can turn this off in PlainSight's Options ("Get hiding rule updates from GitHub"). PlainSight then uses only the rules that came with the extension.

## What PlainSight does not do

- No analytics, telemetry, tracking or advertising.
- No remote code.
- It does not read, store or send your searches, the pages you visit or your search results. It only changes how Google Search pages look in your own browser.
- It does not change your default search engine or your browser's search settings.

## Reporting a problem

The "Report a problem" button opens a GitHub issue form prefilled with the PlainSight version, browser name and version, mode and browser language. Nothing is sent until you review the form and submit it yourself on GitHub.

## Permissions

- `storage`: save your settings, the counter and the downloaded hiding rules.
- `declarativeNetRequestWithHostAccess` and access to Google Search domains: add Google's Web filter to searches and hide AI blocks on Google Search pages.

## Contact

Open an issue at https://github.com/GrantTotinov/PlainSight/issues.
