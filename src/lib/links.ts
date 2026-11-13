export const REPO_URL = 'https://github.com/GrantTotinov/PlainSight';
export const SPONSORS_URL = 'https://github.com/sponsors/GrantTotinov';
// Homepage rather than one store, so the link works for Chrome, Edge and Firefox users.
export const AI_EXPORTER_URL = 'https://granttotinov.github.io/AIExporter/';
// TODO(verify): AMO slug once the listing exists.
const AMO_SLUG = 'plainsight';

export type TargetBrowser = 'chrome' | 'edge' | 'firefox';

export function reviewUrl(target: TargetBrowser, extensionId: string): string {
  switch (target) {
    case 'firefox':
      return `https://addons.mozilla.org/firefox/addon/${AMO_SLUG}/reviews/`;
    case 'edge':
      return `https://microsoftedge.microsoft.com/addons/detail/${extensionId}`;
    default:
      return `https://chromewebstore.google.com/detail/${extensionId}/reviews`;
  }
}

export interface ReportInfo {
  version: string;
  browser: string;
  mode: string;
  language: string;
}

/**
 * Prefilled "Not working on my Google" issue. Only these four fields, never URLs or queries:
 * the user reviews the form on GitHub and submits it themselves.
 */
export function reportUrl(info: ReportInfo): string {
  const url = new URL(`${REPO_URL}/issues/new`);
  url.searchParams.set('template', 'not-working.yml');
  for (const key of ['version', 'browser', 'mode', 'language'] as const) {
    url.searchParams.set(key, info[key].slice(0, 40));
  }
  return url.href;
}

/** "Chrome 142" style name from the user agent, without anything identifying. */
export function browserName(target: TargetBrowser, userAgent: string): string {
  const pattern = { chrome: /Chrome\/(\d+)/, edge: /Edg\/(\d+)/, firefox: /Firefox\/(\d+)/ }[
    target
  ];
  const major = pattern.exec(userAgent)?.[1];
  const name = { chrome: 'Chrome', edge: 'Edge', firefox: 'Firefox' }[target];
  return major ? `${name} ${major}` : name;
}

// Ask for a review only after PlainSight has clearly been useful for a while.
const REVIEW_MIN_HIDDEN = 20;
const REVIEW_MIN_DAYS = 7;

export function shouldAskForReview(
  stats: { hiddenCount: number; installedAt: number; reviewPromptDismissed: boolean },
  now = Date.now(),
): boolean {
  return (
    !stats.reviewPromptDismissed &&
    stats.hiddenCount >= REVIEW_MIN_HIDDEN &&
    now - stats.installedAt >= REVIEW_MIN_DAYS * 24 * 60 * 60 * 1000
  );
}
