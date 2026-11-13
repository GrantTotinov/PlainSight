import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '../../components/ui.css';
import { HostAccessNotice, SettingsForm, t, useSettings } from '../../components/ui';
import type { PageStatus } from '../../lib/hide';
import { SEARCH_HOSTS } from '../../lib/hosts';
import {
  browserName,
  COFFEE_URL,
  REPO_URL,
  reportUrl,
  reviewUrl,
  shouldAskForReview,
  storeUrl,
  type TargetBrowser,
} from '../../lib/links';
import { send } from '../../lib/messages';
import { loadStats, type Stats } from '../../lib/stats';
import { checkForUpdate, type UpdateCheck } from '../../lib/updates';

const TARGET = import.meta.env.BROWSER as TargetBrowser;
const hosts = new Set(SEARCH_HOSTS);

function Popup() {
  const [settings, update] = useSettings();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<{ id: number; paused: boolean; page: PageStatus | null } | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const [shortcut, setShortcut] = useState('');

  useEffect(() => {
    void loadStats().then(setStats);
    void browser.commands
      .getAll()
      .then((all) => setShortcut(all.find((c) => c.name === 'toggle-tab')?.shortcut ?? ''))
      .catch(() => {});
    void (async () => {
      // Without the tabs permission, url is only filled in for Google Search tabs.
      const [active] = await browser.tabs.query({ active: true, currentWindow: true });
      if (active?.id === undefined || !active.url || !hosts.has(new URL(active.url).hostname))
        return;
      const [paused, page] = await Promise.all([
        send({ type: 'isPaused', tabId: active.id }),
        browser.tabs
          .sendMessage(active.id, { type: 'pageStatus' })
          .then((s) => (s as PageStatus | undefined) ?? null)
          .catch(() => null), // page loaded before install, or not a results page
      ]);
      setTab({ id: active.id, paused, page });
    })();
  }, []);

  if (!settings || !stats) return null;

  const togglePause = async () => {
    if (!tab) return;
    await send({ type: 'setPaused', tabId: tab.id, paused: !tab.paused });
    setTab({ ...tab, paused: !tab.paused });
    await browser.tabs.reload(tab.id);
  };

  // Show the hidden AI once, on this page only. The next search hides it again.
  const reveal = async () => {
    if (!tab) return;
    const page = await browser.tabs
      .sendMessage(tab.id, { type: 'reveal' })
      .then((s) => (s as PageStatus | undefined) ?? null)
      .catch(() => null);
    setTab({ ...tab, page });
    setRevealed(true);
  };

  const dismissReview = () => {
    setStats({ ...stats, reviewPromptDismissed: true });
    void browser.storage.local.set({ reviewPromptDismissed: true });
  };

  const report = reportUrl({
    version: browser.runtime.getManifest().version,
    browser: browserName(TARGET, navigator.userAgent),
    mode: settings.mode,
    language: browser.i18n.getUILanguage(),
  });

  return (
    <main class="stack" style={{ width: '320px', padding: '14px' }}>
      <div class="row">
        <h1>PlainSight</h1>
        <span class="muted">{t('hiddenCount', String(stats.hiddenCount))}</span>
      </div>
      <HostAccessNotice />
      <SettingsForm settings={settings} update={update} />
      {tab && settings.mode !== 'off' && (
        <div class="stack">
          {tab.paused && <span class="muted">{t('pausedNotice')}</span>}
          {!tab.paused && tab.page?.kept ? (
            <div class="notice" role="status">
              {t('statusKept')}{' '}
              {settings.mode !== 'webOnly' && (
                <button class="link-button" onClick={() => update({ mode: 'webOnly' })}>
                  {t('switchToWebOnly')}
                </button>
              )}
            </div>
          ) : (
            !tab.paused &&
            tab.page?.overviewHidden && (
              <span class="muted">
                {t('statusHidden')}{' '}
                <button class="link-button" onClick={reveal}>
                  {t('revealPage')}
                </button>
              </span>
            )
          )}
          {revealed && <span class="muted">{t('revealedNotice')}</span>}
          <button onClick={togglePause}>{t(tab.paused ? 'resumeTab' : 'pauseTab')}</button>
          {shortcut && <span class="muted">{t('shortcutHint', shortcut)}</span>}
        </div>
      )}
      {shouldAskForReview(stats) && (
        <div class="notice row">
          <span>
            {t('reviewPrompt')}{' '}
            <a
              href={reviewUrl(TARGET, browser.runtime.id)}
              target="_blank"
              rel="noopener"
              onClick={dismissReview}
            >
              {t('reviewLink')}
            </a>
          </span>
          <button class="link-button" onClick={dismissReview} aria-label={t('dismiss')}>
            ✕
          </button>
        </div>
      )}
      <SupportSection />
      <div class="row">
        <a href={report} target="_blank" rel="noopener">
          {t('reportProblem')}
        </a>
        <button class="link-button" onClick={() => void browser.runtime.openOptionsPage()}>
          {t('options')}
        </button>
      </div>
      <VersionFooter />
    </main>
  );
}

/** Same idea as in AI Exporter: a review, a coffee or a star keeps PlainSight free. */
function SupportSection() {
  const link = (href: string, icon: string, label: string) => (
    <a class="support-button" href={href} target="_blank" rel="noopener">
      <span aria-hidden="true">{icon}</span> {label}
    </a>
  );
  return (
    <section class="support">
      <p class="muted">{t('supportPrompt')}</p>
      <div class="support-row">
        {link(reviewUrl(TARGET, browser.runtime.id), '★', t('reviewLink'))}
        {link(COFFEE_URL, '☕', t('buyCoffee'))}
        {link(REPO_URL, '⭐', t('starGithub'))}
      </div>
    </section>
  );
}

/** "v0.2.0 · Check for updates". Asks the store directly where the browser allows it. */
function VersionFooter() {
  const [check, setCheck] = useState<UpdateCheck | 'checking' | null>(null);
  const version = browser.runtime.getManifest().version;
  const store = storeUrl(TARGET, browser.runtime.id);

  const run = async () => {
    setCheck('checking');
    const result = await checkForUpdate();
    if (result.status === 'unsupported') {
      // Firefox updates add-ons by itself and has no check to call: show the store page.
      window.open(store, '_blank', 'noopener');
      setCheck(null);
      return;
    }
    setCheck(result);
  };

  let status;
  if (check === 'checking') status = <span>{t('updateChecking')}</span>;
  else if (check?.status === 'update_available')
    status = (
      <button class="link-button" onClick={() => browser.runtime.reload()}>
        {t('updateInstall', check.version ?? '')}
      </button>
    );
  else if (check?.status === 'no_update') status = <span>{t('upToDate')}</span>;
  else if (check)
    status = (
      <a href={store} target="_blank" rel="noopener">
        {t('updateOpenStore')}
      </a>
    );
  else
    status = (
      <button class="link-button" onClick={run}>
        {t('checkUpdates')}
      </button>
    );

  return (
    <footer class="row muted" style={{ justifyContent: 'center', gap: '6px' }}>
      <span>v{version}</span>
      <span aria-hidden="true">·</span>
      <span role="status">{status}</span>
    </footer>
  );
}

render(<Popup />, document.getElementById('app')!);
