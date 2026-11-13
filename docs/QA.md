# Manual QA checklist

Run before every release, in each browser. Automated coverage is noted where it exists:

- `pnpm test`: unit and fixture tests (happy-dom).
- `pnpm build:chrome && pnpm e2e`: the built Chrome extension in Playwright's Chromium, with Google pages served from `test/fixtures` (no traffic to Google).

Legend: ✅ verified, ❌ broken, ⏳ not checked yet. Add the date and version when you fill a column.

| #   | Check                                                                    | Automated        | Chrome | Edge | Firefox | Firefox Android |
| --- | ------------------------------------------------------------------------ | ---------------- | ------ | ---- | ------- | --------------- |
| 1   | Search from the address bar (Hide AI and Web only)                       |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 2   | Search from google.com                                                   |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 3   | Results with an AI Overview: block hidden, no flash, results intact      | fixtures, e2e    | ⏳     | ⏳   | ⏳      | ⏳              |
| 4   | Results without an AI Overview: nothing extra hidden                     | fixtures, e2e    | ⏳     | ⏳   | ⏳      | ⏳              |
| 5   | Images, News, Videos, Shopping tabs open normally in Web only            | e2e (URL)        | ⏳     | ⏳   | ⏳      | ⏳              |
| 6   | AI Mode tab hidden; with Block AI Mode, `udm=50` goes to regular results | fixtures, e2e    | ⏳     | ⏳   | ⏳      | ⏳              |
| 7   | "All" tab in Web only goes back to the Web filter (expected)             | unit (rules)     | ⏳     | ⏳   | ⏳      | ⏳              |
| 8   | "Show full Google results" link opens full results and pauses the tab    | e2e              | ⏳     | ⏳   | ⏳      | ⏳              |
| 9   | Back and forward navigation between Web filter and full results          |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 10  | Signed in and signed out                                                 |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 11  | Dark mode (Google and PlainSight pages)                                  |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 12  | Non-English Google UI (at least de, ja, bg)                              | partial          | ⏳     | ⏳   | ⏳      | ⏳              |
| 13  | Pause on tab from the popup, resume, close the tab (pause is gone)       | e2e (link)       | ⏳     | ⏳   | ⏳      | ⏳              |
| 14  | Mode switching applies without reload issues                             | e2e              | ⏳     | ⏳   | ⏳      | ⏳              |
| 15  | Welcome page opens on install; closing it keeps Hide AI                  | e2e              | ⏳     | ⏳   | ⏳      | ⏳              |
| 16  | Homepage AI Mode button hidden, search box works                         | fixtures, e2e    | ⏳     | ⏳   | ⏳      | ⏳              |
| 17  | Counter goes up once per page with an AI Overview                        | e2e              | ⏳     | ⏳   | ⏳      | ⏳              |
| 18  | Report a problem opens a prefilled issue with no URL or query            | unit             | ⏳     | ⏳   | ⏳      | ⏳              |
| 19  | Firefox: host access missing shows "Allow access" and granting it works  |                  | n/a    | n/a  | ⏳      | ⏳              |
| 20  | Options page: settings, sponsor link, version                            |                  | ⏳     | ⏳   | ⏳      | ⏳              |
| 21  | "Hide People also ask": hidden while on, back when off, Videos untouched | fixtures, e2e    | ⏳     | ⏳   | ⏳      | ⏳              |
| 22  | AI Mode opened on purpose (browser AI Mode button) is not blanked        | e2e              | ⏳     | ⏳   | ⏳      | ⏳              |
| 23  | Web only: I'm Feeling Lucky and Jobs still work                          | unit, e2e        | ⏳     | ⏳   | ⏳      | ⏳              |
| 24  | Popup shows "AI Overview hidden on this page" on a results tab           | e2e (message)    | ⏳     | ⏳   | ⏳      | ⏳              |
| 25  | "Show it on this page" reveals without reload; next search hides again   | e2e (message)    | ⏳     | ⏳   | ⏳      | ⏳              |
| 26  | Alt+Shift+H pauses and resumes the current Google tab; popup shows it    | e2e (registered) | ⏳     | ⏳   | ⏳      | ⏳              |
| 27  | Selector update from GitHub applies (needs the public repo)              | unit, e2e        | ⏳     | ⏳   | ⏳      | ⏳              |

## Results so far (2026-11-13, v0.1.0)

- Chrome (Playwright Chromium): all 19 e2e checks pass on fixtures captured that day (en, google.com).
- Live Google, normal (headed) browser, 2026-11-13: PlainSight's selectors hid the AI Overview, its side panel and the AI Mode tab, and left results and "People also ask" in place. See `store/assets/google-before.png` and `google-after.png`.
- Resilience: fixture tests simulate renamed classes, a pluralized or lowercased heading and an unknown heading. The AI Overview stays hidden in all of them and no result is ever hidden.
- Live Google, one headless run: redirects were confirmed in the URLs Google received (`udm=14` added, `udm=2` kept, `udm=50` sent to `udm=14`), then Google answered with a captcha because the browser was headless. Repeat rows 1 to 9 by hand in a normal browser.
- Firefox: `web-ext lint` reports 0 errors and 1 warning (`innerHTML` inside the bundled Preact runtime, not used by PlainSight). Every DNR feature used is supported since Firefox 113 per MDN compatibility data. Not yet run in Firefox.
- Firefox for Android: the APIs are supported (MDN data mirrors desktop), so `gecko_android` is set to 142, the first version with the built-in data consent. Google's mobile page has a different layout, so Hide AI on mobile needs its own fixtures. Web only works there because it does not depend on the page layout.
- Edge: same build as Chrome. Not yet run in Edge.
