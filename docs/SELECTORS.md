# Updating selectors when Google changes its page

Hide AI mode finds AI blocks in five independent ways, all driven by `src/selectors/selectors.json` and `src/lib/hide.ts`. A Google redesign has to defeat all of them at once before an AI Overview shows up again:

1. **CSS (`selectors`)**: injected at `document_start`, so known blocks never flash on screen.
2. **Heading text (`headingText`)**: a `MutationObserver` looks for the heading of the AI Overview ("AI Overview") in every listed language and hides the largest surrounding block that contains no search result. Matching ignores case and punctuation and tolerates a short plural ending ("AI Overviews").
3. **Button text (`buttonText`)**: links and buttons labelled "AI Mode" (tabs, pills, the homepage button).
4. **Accessibility labels**: elements whose `aria-label` mentions the AI Overview, such as the "Show more AI Overview" button. Google keeps these for screen readers, so they change less often than classes.
5. **AI Mode links inside the content**: "Dive deeper in AI Mode" style links (`udm=50`) outside the tab bar. The block around them is the AI Overview.

Layers 2 to 5 keep working when Google renames classes, so a broken CSS selector shows up as a short flash rather than a visible AI Overview. `test/hide.test.ts` ("when Google changes the page") simulates renamed classes, reworded headings and unknown headings on the real fixtures.

If Google changes the page so much that all five miss, **Web only** mode still works because Google applies its Web filter on the server.

## Safety rules (enforced in `src/lib/hide.ts`)

- A hidden block never contains a search result title (`a h3`) and never is or contains `#search`, `#rso`, `#center_col` or `#rcnt`.
- Layers 2, 4 and 5 climb from a starting point inside the AI block and stop before the first ancestor that holds a search result.
- No layer climbs out of the tab bar, header or search box (`[role="navigation"]`, `[role="list"]`, `form`, ...).
- If a selector matches something that breaks these rules, PlainSight marks it `data-plainsight-keep` and shows it. The popup then tells the user that something was left visible and offers Web only. In development builds the console logs `[PlainSight] guard kept`.
- Headings inside links are ignored, so a result titled "AI Overview" is never hidden.
- On an AI Mode page the user opened on purpose (`udm=50`), nothing is hidden, so the page never turns blank.

## When something breaks

1. Reproduce it and save the page: `pnpm fixtures:capture <locale>` (headed browser, persistent profile, low request rate). Read `scripts/capture-fixtures.ts` for details. Review the new files before committing: fixtures are public.
2. Run `pnpm test`. A failing fixture test tells you which page and which check broke.
3. Find the new structure in the saved HTML. Prefer, in this order: element IDs and ARIA roles, other stable attributes (`href` patterns like `udm=50`, `data-*` attributes), and obfuscated class names only as a last resort.
4. Update `selectors.json`: bump `updated`, keep `schemaVersion` unless the shape changes.
5. Run `pnpm test`, then `pnpm build:chrome && pnpm e2e`, then check the page by hand.
6. Bug fix commits come in pairs: first the new fixture (failing test), then the fix.

Community filter lists are a good early warning, for example [Stevo's GenAI blocklist](https://github.com/Stevoisiak/Stevos-AI-Blocklist). Check any selector from them against the fixtures before adding it.

## Current selectors (2026-11-13)

| Selector                                     | Feature            | What it is                                                            |
| -------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `.M8OgIe`                                    | AI Overview        | AI Overview block above the results (direct child of `[role="main"]`) |
| `#eKIzJc`                                    | AI Overview        | AI Overview content, also when Google puts it inside `#rso`           |
| `[data-attnms]`                              | AI Overview        | AI Overview container (also used by community filter lists)           |
| `[role="listitem"]:has(a[href*="udm=50"])`   | AI Mode            | AI Mode tab                                                           |
| `a[href*="/search?"][href*="udm=50"]`        | AI Mode            | Any other AI Mode link, relative or absolute                          |
| `form[role="search"] button[role="link"]`    | AI Mode            | AI Mode button inside the homepage search box                         |
| `.plR5qb`                                    | AI Mode            | Same button, by class                                                 |
| `.xOchs`                                     | AI Mode            | AI button in the mobile search bar (from community lists, unverified) |
| `[role="button"][data-azi][jsname="pLYtdd"]` | AI Mode            | AI buttons below the search bar (from community lists, unverified)    |
| `.cUnQKe:has([jsname="YrZdPb"][data-evn])`   | People also ask \* | The "People also ask" box when its answers are AI-written             |
| `[jsname="YrZdPb"][data-evn]`                | People also ask \* | A single AI-answered question                                         |

\* Optional, only while "Hide People also ask" is on. Rules marked `"optional": true` in `selectors.json` are left out of the CSS and the scan until the user enables them.

## Heading text per language

Only English is verified against a real page. Every other language in `headingText` and `buttonText` is `TODO(verify)`: open Google in that language (`hl=<code>`), search for a question, and copy the exact heading text of the AI Overview, the label of the AI Mode tab and the title of the "People also ask" box.
