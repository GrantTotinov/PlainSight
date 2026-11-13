# Privacy policy for the store listings

The policy text lives in [PRIVACY.md](../PRIVACY.md), so there is only one copy to keep up to date.

Publishing it for the store forms: enable GitHub Pages for the repository (Settings, Pages, "Deploy from a branch", `main`, folder `/ (root)`). The policy is then at:

https://granttotinov.github.io/PlainSight/PRIVACY.html

Use that URL in the Chrome Web Store, Edge Add-ons and AMO privacy policy fields.

Chrome Web Store "Privacy practices" tab: single purpose is "Remove AI-generated features (AI Overviews, AI Mode entry points) from Google Search so users see regular web results." Data usage: tick nothing (no data collected). Permission justifications:

- `storage`: saves the user's mode and options, and a local counter shown in the popup.
- `declarativeNetRequestWithHostAccess`: adds Google's own Web filter parameter (`udm=14`) to searches in Web only mode, and redirects AI Mode to regular results if the user enables that option.
- Host permissions (Google Search domains only): needed for the redirects above and for the content script that hides AI blocks on Google Search pages.
- Remote code: none. PlainSight downloads a JSON file of CSS selectors and heading texts (data, not code) once a day from its public GitHub repository, validates it strictly and falls back to the bundled copy. No user data is sent; the request has no cookies, referrer, query string or identifier. Users can turn it off in Options; it is disclosed in Options, on the welcome page, in the listing and in the privacy policy.
- AMO data collection: `{"required": ["none"]}` stays correct, because nothing about the user is collected or sent.

Search settings policy: PlainSight does not change the default search engine or the browser's search settings. Web only is opt-in (the default mode is Hide AI), is chosen by the user on the welcome page or in the popup, and only adds Google's own documented Web filter to Google's own result pages. Say this in the listing and in the reviewer notes, because the Chrome Web Store removes extensions that change the search experience through anything other than the Settings Overrides API.

AMO reviewer notes: the build is `pnpm install --frozen-lockfile && pnpm build:firefox` (see README). `web-ext lint` shows one warning about `innerHTML`: it comes from the bundled Preact runtime (`dangerouslySetInnerHTML` support), which PlainSight never uses.
