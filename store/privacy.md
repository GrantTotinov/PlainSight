# Privacy policy for the store listings

The policy text lives in [PRIVACY.md](../PRIVACY.md), so there is only one copy to keep up to date.

Publishing it for the store forms: enable GitHub Pages for the repository (Settings, Pages, "Deploy from a branch", `main`, folder `/ (root)`). The policy is then at:

https://granttotinov.github.io/PlainSight/PRIVACY.html

Use that URL in the Chrome Web Store, Edge Add-ons and AMO privacy policy fields.

Chrome Web Store "Privacy practices" tab: single purpose is "Remove AI-generated features (AI Overviews, AI Mode entry points) from Google Search so users see regular web results." Data usage: tick nothing (no data collected). Permission justifications:

- `storage`: saves the user's mode and options, and a local counter shown in the popup.
- `declarativeNetRequestWithHostAccess`: adds Google's own Web filter parameter (`udm=14`) to searches in Web only mode, and redirects AI Mode to regular results if the user enables that option.
- Host permissions (Google Search domains only): needed for the redirects above and for the content script that hides AI blocks on Google Search pages.
- Remote code: none.
