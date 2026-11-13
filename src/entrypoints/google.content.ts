import { createHider, type SelectorConfig } from '../lib/hide';
import { CONTENT_MATCHES } from '../lib/hosts';
import { send } from '../lib/messages';
import { pickConfig, REMOTE_KEY } from '../lib/remote';
import { loadSettings, migrate, SETTINGS_KEY, type Settings } from '../lib/settings';
import selectors from '../selectors/selectors.json';

const LINK_ID = 'plainsight-full-results';
const bundled = selectors as SelectorConfig;

export default defineContentScript({
  matches: CONTENT_MATCHES,
  runAt: 'document_start',
  async main() {
    // The user opened AI Mode on purpose (a link, a bookmark, the browser's own AI Mode button).
    // Hiding the AI parts of that page would leave it blank. Block AI Mode redirects it instead.
    const onAiModePage = () => new URL(location.href).searchParams.get('udm') === '50';

    // Hide first, ask questions later: AI blocks must never flash on screen.
    // The bundled selectors apply at once; a newer downloaded copy replaces them a moment later.
    const hider = createHider(document, bundled, () => {
      void send({ type: 'countHidden' }).catch(() => {});
    });
    if (!onAiModePage()) hider.start();

    browser.runtime.onMessage.addListener((msg: { type?: string }, _sender, sendResponse) => {
      if (msg?.type === 'pageStatus') sendResponse(hider.status());
    });

    // Listen before the first await: the daily selector download often finishes while this
    // page is still loading, and a change event fired before the listener exists is lost.
    let current: Settings | undefined;
    let remote: unknown;
    let remoteSeen = false;
    let paused = false;
    let ready = false;

    const apply = (s: Settings) => {
      current = s;
      hider.setConfig(s.remoteUpdates ? pickConfig(bundled, remote) : bundled);
      const on = s.mode !== 'off' && !paused && !onAiModePage();
      hider.setEnabled(on, s.hidePeopleAlsoAsk ? ['peopleAlsoAsk'] : []);
      if (on && s.mode === 'webOnly') whenReady(addFullResultsLink);
      else document.getElementById(LINK_ID)?.remove();
    };

    browser.storage.onChanged.addListener((changes, area) => {
      const settingsChanged = area === 'sync' && SETTINGS_KEY in changes;
      const remoteChanged = area === 'local' && REMOTE_KEY in changes;
      if (settingsChanged) current = migrate(changes[SETTINGS_KEY]?.newValue);
      if (remoteChanged) {
        remote = changes[REMOTE_KEY]?.newValue;
        remoteSeen = true;
      }
      if (ready && current && (settingsChanged || remoteChanged)) apply(current);
    });

    const [settings, pausedNow, stored] = await Promise.all([
      loadSettings(),
      send({ type: 'isPaused' }).catch(() => false),
      browser.storage.local.get(REMOTE_KEY).catch(() => ({})),
    ]);
    paused = pausedNow;
    if (!remoteSeen) remote = (stored as Record<string, unknown>)[REMOTE_KEY];
    ready = true;
    apply(current ?? settings);
  },
});

function whenReady(fn: () => void) {
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  else fn();
}

/**
 * In Web only mode the "All" tab would redirect straight back to the Web filter.
 * This link pauses PlainSight for the tab and opens the full results page.
 */
function addFullResultsLink() {
  const url = new URL(location.href);
  if (url.pathname !== '/search' || url.searchParams.get('udm') !== '14') return;
  const search = document.getElementById('search');
  if (!search || document.getElementById(LINK_ID)) return;
  url.searchParams.delete('udm');

  const link = document.createElement('a');
  link.id = LINK_ID;
  link.href = url.href;
  link.textContent = browser.i18n.getMessage('showFullResults');
  link.style.cssText =
    'display:inline-block;margin:0 0 16px;font-size:14px;color:inherit;opacity:.75;text-decoration:underline;';
  link.addEventListener('click', async (event) => {
    event.preventDefault();
    await send({ type: 'setPaused', paused: true }).catch(() => {});
    location.href = link.href;
  });
  search.before(link);
}
