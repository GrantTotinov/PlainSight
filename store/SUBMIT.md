# What to paste where (store submission cheat sheet)

Files: zips from the latest GitHub release (also in `.output/store-ready/`), images in `store/assets/`, texts below.

## Texts, for every store

| Field                       | Where to copy it from                                                                                     |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Name / title                | Comes from the package (`extName`). English: `PlainSight: Hide AI Overviews & AI Mode for Google Search™` |
| Short description / summary | Comes from the package (`extDescription`). Also in `store/listing/en.md`, "Short description"             |
| Full / detailed description | `store/listing/<locale>.md`, everything under "Full description" (19 languages)                           |
| Category                    | Chrome: Productivity (Workflow & Planning). Edge: Productivity. Firefox: Search Tools                     |
| Website / homepage          | https://github.com/GrantTotinov/PlainSight                                                                |
| Support URL / email         | https://github.com/GrantTotinov/PlainSight/issues                                                         |
| Privacy policy URL          | https://granttotinov.github.io/PlainSight/PRIVACY.html                                                    |
| License (AMO)               | MIT                                                                                                       |
| Price                       | Free                                                                                                      |

Paste each language's full description into that language's listing. The store takes title and short description from the package `_locales`, so those are already translated.

## Images

| Store   | Upload                                                                                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Chrome  | Icon `store-icon-128.png`, screenshots `1-before-after.png` `2-popup.png` `3-welcome.png` `4-privacy.png`, small promo tile `promo-small-440x280.png` (required), marquee `promo-marquee-1400x560.png` |
| Edge    | Logo `edge-logo-300.png`, the same 4 screenshots, optional tiles `promo-small-440x280.png` and `promo-marquee-1400x560.png`                                                                            |
| Firefox | The same 4 screenshots (the icon comes from the package)                                                                                                                                               |

## Chrome Web Store, "Privacy practices" tab

- **Single purpose:** Remove AI-generated features (AI Overviews, AI Mode entry points) from Google Search so users see regular web results.
- **storage justification:** Saves the user's mode and options, a local counter shown in the popup, and the latest hiding rules.
- **declarativeNetRequestWithHostAccess justification:** Adds Google's own Web filter parameter (udm=14) to Google searches in the optional Web only mode, and redirects AI Mode to regular results if the user turns that option on. It does not change the default search engine.
- **Host permission justification:** Only Google Search domains. Needed for the redirects above and for the content script that hides AI blocks on Google Search pages.
- **Remote code:** No. (Once a day the extension downloads a JSON file of CSS selectors and heading texts from its public GitHub repository: data, not code. Disclosed in Options, on the welcome page, in the listing and in the privacy policy.)
- **Data usage:** tick nothing. Certify the three statements (no selling, no unrelated use, no creditworthiness use).

## Firefox Add-ons (AMO)

- **Source code:** upload `plainsight-<version>-sources.zip`.
- **Notes to reviewer:** Build with Node 24 and pnpm: `pnpm install --frozen-lockfile && pnpm build:firefox`, output in `.output/firefox-mv3`. The only `web-ext lint` warning (innerHTML) comes from the bundled Preact runtime (`dangerouslySetInnerHTML` support), which PlainSight never uses. The extension downloads a JSON file of CSS selectors from its own public GitHub repository once a day (data only, validated, can be turned off in Options); nothing about the user is sent.
- **Compatibility:** Firefox and Firefox for Android.
- **Data collection:** already declared in the package as none.

## Edge Add-ons

- **Notes for certification:** same text as the AMO reviewer notes.
- Availability: all markets. Visibility: public.

More context: `store/privacy.md` (privacy answers), `store/assets.md` (image sizes), `docs/RELEASING.md` (release steps, automated updates).
