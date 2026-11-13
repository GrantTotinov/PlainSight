# Store assets

## Required sizes

| Asset              | Chrome Web Store                               | Edge Add-ons (TODO(verify) in Partner Center) | Firefox AMO                      |
| ------------------ | ---------------------------------------------- | --------------------------------------------- | -------------------------------- |
| Extension icons    | 16, 32, 48, 128 px PNG in the package          | same package icons                            | same package icons (48, 96 used) |
| Store icon         | 128 x 128 PNG (artwork 96 x 96, 16 px padding) | 300 x 300 PNG logo                            | taken from the package           |
| Screenshots        | 1280 x 800 (or 640 x 400), 1 to 5              | 1280 x 800 (or 640 x 480), up to 10           | 1280 x 800 recommended, up to 10 |
| Small promo tile   | 440 x 280 (required)                           | 440 x 280 (optional)                          | n/a                              |
| Marquee promo tile | 1400 x 560 (optional)                          | 1400 x 560 (optional)                         | n/a                              |

The current icons in `public/icon/` are placeholders generated for development.

## Screenshot plan

Use unaltered Google result pages (allowed by the Chrome Web Store branding guidelines). English first, then the top locales.

1. **Before and after**: the same query (for example "how do airplanes fly") with the AI Overview, and with PlainSight in Hide AI mode. Side by side, with a short caption: "Real results first."
2. **Web only**: a results page in the Web filter, with the "Show full Google results" link visible. Caption: "Just links. Keeps working when Google changes its page."
3. **Popup**: the three modes, Block AI Mode, the counter. Caption: "Switch modes or pause a tab in one click."
4. **Welcome page**: the two choices. Caption: "Pick your Google on install."
5. **Privacy**: plain card with "No data collected. No tracking. Open source." in large type.

Capture at 1280 x 800, light theme, browser chrome cropped, no personal bookmarks, signed out, no location in the Google footer.

## Icon brief

- Concept: plain sight, a clear lens or open eye, the idea of seeing the page as it is.
- Must not use the Google logo, the letter "G", the Google four-color scheme, or anything that looks like a Google product icon.
- Must read at 16 px in light and dark browser toolbars. Simple shape, one strong color plus white.
- Placeholder colour: teal `#0f766e`. Fine to change.
- Deliverables: 16, 32, 48, 96, 128 px PNG (transparent background), 300 x 300 PNG for Edge, 440 x 280 promo tile, source file (SVG or Figma).
