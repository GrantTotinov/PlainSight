import { GOOGLE_DOMAINS } from '../google-domains';

// Google Search always serves results from the www host; bare domains redirect there.
export const SEARCH_HOSTS: readonly string[] = GOOGLE_DOMAINS.map((d) => `www.${d}`);

export const HOST_PERMISSIONS: string[] = SEARCH_HOSTS.map((h) => `https://${h}/*`);

// Homepage (with and without query), results page and the legacy /webhp homepage.
export const CONTENT_MATCHES: string[] = SEARCH_HOSTS.flatMap((h) =>
  ['/', '/?*', '/search*', '/webhp*'].map((path) => `https://${h}${path}`),
);
