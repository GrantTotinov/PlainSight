export type Feature = 'aiOverview' | 'aiMode';

export interface SelectorRule {
  id: string;
  feature: Feature;
  /** CSS selectors hidden before first paint. Prefer structural or attribute selectors. */
  selectors: string[];
  /** Exact heading text of the block, per Google UI locale. */
  headingText?: Record<string, string[]>;
  /** Exact text of a link or button that opens the feature, per Google UI locale. */
  buttonText?: Record<string, string[]>;
}

export interface SelectorConfig {
  schemaVersion: 1;
  updated: string;
  rules: SelectorRule[];
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

const allText = (byLocale: Record<string, string[]> | undefined) =>
  Object.values(byLocale ?? {}).flat();

/**
 * CSS that hides every known selector, unless a safety guard marked the element to keep.
 * One rule per selector, so a selector a browser does not support only drops itself.
 */
export function buildCss(config: SelectorConfig): string {
  const selectors = config.rules.flatMap((r) => r.selectors).map((s) => `${s}:not([${KEEP_ATTR}])`);
  return [...selectors, `[${HIDDEN_ATTR}]`]
    .map((s) => `${s} { display: none !important; }`)
    .join('\n');
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
  /** Turn hiding on or off (Off mode, paused tab, settings change). */
  setEnabled(on: boolean): void;
  /** Scan a subtree right away. Exposed for tests. */
  scan(root: Element): void;
}

export function createHider(
  doc: Document,
  config: SelectorConfig,
  onAiOverviewHidden: () => void,
): Hider {
  const css = buildCss(config);
  const ruleSelectors = config.rules.flatMap((r) =>
    r.selectors.map((selector) => ({ selector, feature: r.feature })),
  );
  const headings = new Map<string, Feature>();
  const buttons = new Map<string, Feature>();
  for (const r of config.rules) {
    for (const t of allText(r.headingText)) headings.set(t, r.feature);
    for (const t of allText(r.buttonText)) buttons.set(t, r.feature);
  }
  const textMatch = (el: Element, texts: Map<string, Feature>) => {
    const raw = el.textContent ?? '';
    if (![...texts.keys()].some((t) => raw.includes(t))) return undefined; // cheap pre-check
    return texts.get(visibleText(el));
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
    for (const { selector, feature } of ruleSelectors) {
      try {
        for (const el of within(root, selector))
          hide(feature === 'aiOverview' ? blockFor(el) : el, feature);
      } catch {
        // An unsupported selector must not break the others.
      }
    }
    for (const h of within(root, HEADINGS)) {
      const feature = h.closest('a') ? undefined : textMatch(h, headings);
      if (feature) hide(blockFor(h), feature);
    }
    for (const b of within(root, BUTTONS)) {
      const feature = b.querySelector('h3') ? undefined : textMatch(b, buttons);
      if (!feature) continue;
      // Hide the whole tab when the list item holds nothing else.
      const item = b.closest('[role="listitem"]');
      hide(item && visibleText(item) === visibleText(b) ? item : b, feature);
    }
  };

  // Batch mutations per animation frame and only look at what was added.
  const pending = new Set<Element>();
  let frame = 0;
  const flush = () => {
    frame = 0;
    for (const el of pending) if (el.isConnected) scan(el);
    pending.clear();
  };
  const observer = new MutationObserver((records) => {
    for (const r of records) {
      for (const n of r.addedNodes) {
        const el = n.nodeType === Node.ELEMENT_NODE ? (n as Element) : n.parentElement;
        if (el) pending.add(el);
      }
    }
    if (pending.size && !frame) frame = requestAnimationFrame(flush);
  });

  return {
    start() {
      style.textContent = css;
      doc.documentElement.append(style);
      observer.observe(doc.documentElement, { childList: true, subtree: true });
      scan(doc.documentElement);
    },
    setEnabled(on) {
      state = on ? 'on' : 'off';
      style.textContent = on ? css : '';
      if (on) {
        if (!style.isConnected) doc.documentElement.append(style);
        observer.observe(doc.documentElement, { childList: true, subtree: true });
        scan(doc.documentElement);
        maybeCount();
      } else {
        observer.disconnect();
      }
    },
    scan,
  };
}
