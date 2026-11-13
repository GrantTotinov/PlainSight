export type Feature = 'aiOverview' | 'aiMode' | 'peopleAlsoAsk';

export interface SelectorRule {
  id: string;
  feature: Feature;
  /** Off unless the user turns the feature on in the settings. */
  optional?: boolean;
  /** CSS selectors hidden before first paint. Prefer structural or attribute selectors. */
  selectors: string[];
  /** Heading text of the block, per Google UI locale. */
  headingText?: Record<string, string[]>;
  /** Text of a link or button that opens the feature, per Google UI locale. */
  buttonText?: Record<string, string[]>;
}

export interface SelectorConfig {
  schemaVersion: 1;
  updated: string;
  rules: SelectorRule[];
}

export interface PageStatus {
  /** An AI Overview was found and hidden on this page. */
  overviewHidden: boolean;
  /** Blocks that looked like AI but were left visible by a safety guard. */
  kept: number;
}

export const HIDDEN_ATTR = 'data-plainsight-hidden';
export const KEEP_ATTR = 'data-plainsight-keep';

// The results column. Never hidden, never inside a hidden block.
const RESULTS = '#search, #rso, #center_col, #rcnt, #cnt, #main';
// Never hidden themselves. AI Mode panels use role="main" too, so this is not a "contains" check.
const PROTECTED = `${RESULTS}, [role="main"], body, html`;
// A result title. Blocks we hide must not contain any.
const ORGANIC_TITLE = 'a h3';
const HEADINGS = '[role="heading"], h1, h2';
const BUTTONS = 'a, button, [role="button"], [role="link"]';
// Tabs, header and search box: never climb out of these to find a block.
const CHROME =
  '[role="navigation"], [role="list"], [role="search"], form, header, #top_nav, #hdtb, #appbar';
const AI_MODE_LINK = 'a[href*="udm=50"]';

const allText = (byLocale: Record<string, string[]> | undefined) =>
  Object.values(byLocale ?? {}).flat();

/** Lowercase, single spaces, no punctuation at either end. */
export const normalize = (s: string) =>
  s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');

/**
 * Matches a label against known terms. Tolerates case, punctuation and a short plural ending,
 * so "AI Overviews" or "AI overview:" still match "AI Overview" if Google rewords it slightly.
 */
export function matchTerm<T>(text: string, terms: Map<string, T>): T | undefined {
  const t = normalize(text);
  if (!t || t.length > 60) return undefined;
  for (const [term, value] of terms) {
    if (t === term) return value;
    const rest = t.slice(term.length);
    if (t.startsWith(term) && rest.length <= 2 && /^\p{L}+$/u.test(rest)) return value;
  }
  return undefined;
}

/**
 * CSS that hides every known selector of the active rules, unless a safety guard marked the
 * element to keep. One rule per selector, so a selector a browser does not support only drops
 * itself. Hidden markers are per feature, so turning an option off shows its blocks again.
 */
export function buildCss(rules: SelectorRule[]): string {
  const selectors = rules.flatMap((r) => r.selectors).map((s) => `${s}:not([${KEEP_ATTR}])`);
  const markers = [...new Set(rules.map((r) => r.feature))].map((f) => `[${HIDDEN_ATTR}="${f}"]`);
  return [...selectors, ...markers].map((s) => `${s} { display: none !important; }`).join('\n');
}

/** Text a user would see: skips inline <style>/<script>, which Google puts inside buttons. */
export function visibleText(el: Element): string {
  let text = '';
  const walker = el.ownerDocument.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.parentElement?.closest('style, script')) text += n.nodeValue;
  }
  return text.replace(/\s+/g, ' ').trim();
}

const organicCount = (el: Element) => el.querySelectorAll(ORGANIC_TITLE).length;

/** Final guard before hiding anything. */
export function isSafeToHide(el: Element): boolean {
  return !el.matches(PROTECTED) && !el.querySelector(RESULTS) && organicCount(el) <= 1;
}

/** Highest ancestor of `start` that still holds no organic result and no results container. */
export function blockFor(start: Element): Element {
  let block = start;
  for (let p = start.parentElement; p; p = p.parentElement) {
    if (p.matches(PROTECTED) || p.querySelector(RESULTS) || organicCount(p) > 0) break;
    block = p;
  }
  return block;
}

function* within(root: Element, selector: string): Generator<Element> {
  if (root.matches(selector)) yield root;
  yield* root.querySelectorAll(selector);
}

export interface Hider {
  /** Inject CSS and start watching the page. Call as early as possible. */
  start(): void;
  /**
   * Turn hiding on or off (Off mode, paused tab, settings change). `optional` lists the
   * optional features the user turned on, such as hiding "People also ask".
   */
  setEnabled(on: boolean, optional?: Feature[]): void;
  /** Swap in a newer selector config (downloaded update) without reloading the page. */
  setConfig(config: SelectorConfig): void;
  /** Scan a subtree right away. Exposed for tests. */
  scan(root: Element): void;
  /** What happened on this page, for the popup. */
  status(): PageStatus;
}

export function createHider(
  doc: Document,
  initialConfig: SelectorConfig,
  onAiOverviewHidden: () => void,
): Hider {
  let config = initialConfig;
  let optionalOn: Feature[] = [];
  let css = '';
  let ruleSelectors: { selector: string; feature: Feature }[] = [];
  let headings = new Map<string, Feature>();
  let buttons = new Map<string, Feature>();
  let overviewTerms: string[] = [];
  const compile = (optional: Feature[]) => {
    const rules = config.rules.filter((r) => !r.optional || optional.includes(r.feature));
    css = buildCss(rules);
    ruleSelectors = rules.flatMap((r) =>
      r.selectors.map((selector) => ({ selector, feature: r.feature })),
    );
    headings = new Map();
    buttons = new Map();
    for (const r of rules) {
      for (const t of allText(r.headingText)) headings.set(normalize(t), r.feature);
      for (const t of allText(r.buttonText)) buttons.set(normalize(t), r.feature);
    }
    overviewTerms = [...headings].filter(([, f]) => f === 'aiOverview').map(([t]) => t);
  };
  compile([]);

  const textMatch = (el: Element, terms: Map<string, Feature>) => {
    const raw = (el.textContent ?? '').toLowerCase();
    if (![...terms.keys()].some((t) => raw.includes(t))) return undefined; // cheap pre-check
    return matchTerm(visibleText(el), terms);
  };

  const style = doc.createElement('style');
  let state: 'pending' | 'on' | 'off' = 'pending';
  let sawOverview = false;
  let counted = false;
  const maybeCount = () => {
    if (state === 'on' && sawOverview && !counted) {
      counted = true;
      onAiOverviewHidden();
    }
  };

  const hide = (el: Element, feature: Feature) => {
    if (el.hasAttribute(KEEP_ATTR) || el.hasAttribute(HIDDEN_ATTR)) return;
    if (!isSafeToHide(el)) {
      el.setAttribute(KEEP_ATTR, '');
      if (import.meta.env.DEV) console.debug('[PlainSight] guard kept', feature, el);
      return;
    }
    el.setAttribute(HIDDEN_ATTR, feature);
    if (feature === 'aiOverview') {
      sawOverview = true;
      maybeCount();
    }
  };

  const scan = (root: Element) => {
    // Layer 1: known selectors (also injected as CSS before first paint).
    for (const { selector, feature } of ruleSelectors) {
      try {
        for (const el of within(root, selector)) {
          hide(feature === 'aiOverview' ? blockFor(el) : el, feature);
        }
      } catch {
        // An unsupported selector must not break the others.
      }
    }
    // Layer 2: the heading Google shows above the block, in any listed language.
    for (const h of within(root, HEADINGS)) {
      const feature = h.closest('a') ? undefined : textMatch(h, headings);
      if (feature) hide(blockFor(h), feature);
    }
    // Layer 3: links and buttons labelled "AI Mode".
    for (const b of within(root, BUTTONS)) {
      const feature = b.querySelector('h3') ? undefined : textMatch(b, buttons);
      if (!feature) continue;
      // Hide the whole tab when the list item holds nothing else.
      const item = b.closest('[role="listitem"]');
      hide(item && visibleText(item) === visibleText(b) ? item : b, feature);
    }
    // Fallbacks for when Google renames classes and rewords the heading. Both start inside
    // the AI block and climb with the same guards, so they cannot reach a search result.
    // Layer 4: accessibility labels that mention the AI Overview ("Show more AI Overview").
    for (const el of within(root, '[aria-label]')) {
      const label = normalize(el.getAttribute('aria-label') ?? '');
      if (!overviewTerms.some((t) => label.includes(t)) || el.closest(`a, ${CHROME}`)) continue;
      hide(blockFor(el), 'aiOverview');
    }
    // Layer 5: AI Mode links inside the content ("Dive deeper in AI Mode").
    for (const a of within(root, AI_MODE_LINK)) {
      if (a.closest(CHROME)) continue;
      hide(blockFor(a), 'aiOverview');
    }
  };

  // Batch mutations per animation frame and only look at what changed.
  const pending = new Set<Element>();
  let frame = 0;
  const flush = () => {
    frame = 0;
    for (const el of pending) if (el.isConnected) scan(el);
    pending.clear();
  };
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      // Text written into an existing node (streamed headings) counts too.
      if (r.type === 'characterData') {
        if (r.target.parentElement) pending.add(r.target.parentElement);
        continue;
      }
      for (const n of r.addedNodes) {
        const el = n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement;
        if (el) pending.add(el);
      }
    }
    if (pending.size && !frame) frame = requestAnimationFrame(flush);
  });
  const observe = () =>
    observer.observe(doc.documentElement, { childList: true, characterData: true, subtree: true });

  return {
    start() {
      style.textContent = css;
      doc.documentElement.append(style);
      observe();
      scan(doc.documentElement);
    },
    setEnabled(on, optional = []) {
      state = on ? 'on' : 'off';
      optionalOn = optional;
      compile(optional);
      style.textContent = on ? css : '';
      if (on) {
        if (!style.isConnected) doc.documentElement.append(style);
        observe();
        scan(doc.documentElement);
        maybeCount();
      } else {
        observer.disconnect();
      }
    },
    setConfig(next) {
      config = next;
      compile(optionalOn);
      if (state === 'off') return;
      style.textContent = css;
      scan(doc.documentElement);
    },
    scan,
    status: () => ({
      overviewHidden: state === 'on' && sawOverview,
      kept: state === 'on' ? doc.querySelectorAll(`[${KEEP_ATTR}]`).length : 0,
    }),
  };
}
