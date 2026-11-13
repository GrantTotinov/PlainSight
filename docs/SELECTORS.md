# Updating selectors when Google changes its page

Hide AI mode works in two layers, both driven by `src/selectors/selectors.json`:

1. **CSS (`selectors`)**: injected at `document_start`, so known blocks never flash on screen.
2. **Text (`headingText`, `buttonText`)**: a `MutationObserver` looks for the exact heading of the AI Overview ("AI Overview") and the exact label of AI Mode links or buttons ("AI Mode") in every listed language. It hides the largest surrounding block that contains no search result.

The text layer usually keeps working when Google renames classes, so a broken CSS selector shows up as a short flash rather than a visible AI Overview.

## Safety rules (enforced in `src/lib/hide.ts`)

- A hidden block never contains a search result title (`a h3`) and never is or contains `#search`, `#rso`, `#center_col` or `#rcnt`.
- If a CSS selector matches something that breaks these rules, PlainSight marks it `data-plainsight-keep` and shows it. In development builds the console logs `[PlainSight] guard kept`.
- Headings inside links are ignored, so a result titled "AI Overview" is never hidden.

## When something breaks

1. Reproduce it and save the page: `pnpm fixtures:capture <locale>` (headed browser, persistent profile, low request rate). Read `scripts/capture-fixtures.ts` for details. Review the new files before committing: fixtures are public.
2. Run `pnpm test`. A failing fixture test tells you which page and which check broke.
3. Find the new structure in the saved HTML. Prefer, in this order: element IDs and ARIA roles, other stable attributes (`href` patterns like `udm=50`), and obfuscated class names only as a last resort.
4. Update `selectors.json`: bump `updated`, keep `schemaVersion` unless the shape changes.
5. Run `pnpm test`, then `pnpm build:chrome && pnpm e2e`, then check the page by hand.
6. Bug fix commits come in pairs: first the new fixture (failing test), then the fix.

## Current selectors (2026-11-13)

| Selector                                   | What it is                                                            |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `.M8OgIe`                                  | AI Overview block above the results (direct child of `[role="main"]`) |
| `#eKIzJc`                                  | AI Overview content, also when Google puts it inside `#rso`           |
| `[role="listitem"]:has(a[href*="udm=50"])` | AI Mode tab                                                           |
| `a[href^="/search"][href*="udm=50"]`       | Any other AI Mode link                                                |
| `form[role="search"] button[role="link"]`  | AI Mode button inside the homepage search box                         |

## Heading text per language

Only English is verified against a real page. Every other language in `headingText` and `buttonText` is `TODO(verify)`: open Google in that language (`hl=<code>`), search for a question, and copy the exact heading text of the AI Overview and the exact label of the AI Mode tab. Matching is exact after trimming whitespace.
