import { createHider, type SelectorConfig } from '../lib/hide';
import { CONTENT_MATCHES } from '../lib/hosts';
import { send } from '../lib/messages';
import { loadSettings, migrate, SETTINGS_KEY, type Settings } from '../lib/settings';
import selectors from '../selectors/selectors.json';

const LINK_ID = 'plainsight-full-results';

export default defineContentScript({
  matches: CONTENT_MATCHES,
  runAt: 'document_start',
  async main() {
    // Hide first, ask questions later: AI blocks must never flash on screen.
    const hider = createHider(document, selectors as SelectorConfig, () => {
      void send({ type: 'countHidden' }).catch(() => {});
    });
    hider.start();

    const [settings, paused] = await Promise.all([
      loadSettings(),
      send({ type: 'isPaused' }).catch(() => false),
    ]);

    const apply = (s: Settings) => {
      const on = s.mode !== 'off' && !paused;
      hider.setEnabled(on);
      if (on && s.mode === 'webOnly') whenReady(addFullResultsLink);
      else document.getElementById(LINK_ID)?.remove();
    };
    apply(settings);

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && SETTINGS_KEY in changes)
        apply(migrate(changes[SETTINGS_KEY]?.newValue));
    });
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
