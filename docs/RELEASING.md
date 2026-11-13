# Releasing

## Every release

1. Bump `version` in `package.json` (stores reject a version they already have).
2. Merge to `main` with CI green.
3. Tag and push: `git tag v<version>` and `git push origin v<version>`. The Release workflow checks that the tag matches `package.json`, runs the tests and attaches the Chrome, Edge, Firefox and sources zips to a draft GitHub release. Publish it when ready.
4. Upload to the stores: by hand (below), or with the **Submit to stores** workflow once its secrets are set.

Selector fixes do not need a release: merging a change to `src/selectors/selectors.json` on `main` reaches users within a day (see `docs/SELECTORS.md`).

## First submission (by hand, once per store)

Use the files from the GitHub release and `store/`. Store images are in `store/assets/` (see `store/assets.md`), listing texts in `store/listing/<locale>.md`, privacy answers and reviewer notes in `store/privacy.md`.

- **Chrome Web Store** (https://chrome.google.com/webstore/devconsole): New item, upload `plainsight-<version>-chrome.zip`. Fill Store listing (English plus the other locales), Privacy practices (single purpose, permission justifications, no data collected, privacy policy URL), and submit.
- **Microsoft Edge Add-ons** (https://partner.microsoft.com/dashboard/microsoftedge): New extension, upload `plainsight-<version>-edge.zip`, same texts, logo `edge-logo-300.png`.
- **Firefox Add-ons** (https://addons.mozilla.org/developers/): Submit a new add-on, listed, upload `plainsight-<version>-firefox.zip`. When asked for source code, upload `plainsight-<version>-sources.zip` and paste the reviewer notes from `store/privacy.md`. Choose Firefox and Firefox for Android.

Privacy policy URL: https://github.com/GrantTotinov/PlainSight/blob/main/PRIVACY.md (or the GitHub Pages copy once Pages is on).

## Automated updates (Submit to stores workflow)

After the first manual submission, add these repository secrets (Settings, Secrets and variables, Actions). Leave out a store's secrets to skip that store.

| Store   | Secrets                                                                                                                   | Where to get them                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Chrome  | `CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY` | Developer Dashboard (item ID, publisher ID) and a Google Cloud service account with Chrome Web Store API access |
| Edge    | `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`                                                                       | Partner Center, Microsoft Edge, Publish API                                                                     |
| Firefox | `FIREFOX_EXTENSION_ID` (`plainsight@granttotinov`), `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`                            | https://addons.mozilla.org/developers/addon/api/key/                                                            |

Then run **Actions, Submit to stores, Run workflow** with "dry run" on to check the credentials, and again with it off to upload and submit for review. Locally the same works with `pnpm zip` and `pnpm wxt submit --dry-run ...` (`pnpm wxt submit init` writes a `.env.submit` file, which is git-ignored by the `.env*` rule, never commit it).
