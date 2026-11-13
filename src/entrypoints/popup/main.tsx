import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import '../../components/ui.css';
import { HostAccessNotice, SettingsForm, t, useSettings } from '../../components/ui';
import type { PageStatus } from '../../lib/hide';
import { SEARCH_HOSTS } from '../../lib/hosts';
import {
  browserName,
  reportUrl,
  reviewUrl,
  shouldAskForReview,
  type TargetBrowser,
} from '../../lib/links';
import { send } from '../../lib/messages';
import { loadStats, type Stats } from '../../lib/stats';

const TARGET = import.meta.env.BROWSER as TargetBrowser;
const hosts = new Set(SEARCH_HOSTS);

function Popup() {
  const [settings, update] = useSettings();
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<{ id: number; paused: boolean; page: PageStatus | null } | null>(
    null,
  );

  useEffect(() => {
    void loadStats().then(setStats);
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
            tab.page?.overviewHidden && <span class="muted">{t('statusHidden')}</span>
          )}
          <button onClick={togglePause}>{t(tab.paused ? 'resumeTab' : 'pauseTab')}</button>
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
      <div class="row">
        <a href={report} target="_blank" rel="noopener">
          {t('reportProblem')}
        </a>
        <button class="link-button" onClick={() => void browser.runtime.openOptionsPage()}>
          {t('options')}
        </button>
      </div>
    </main>
  );
}

render(<Popup />, document.getElementById('app')!);
