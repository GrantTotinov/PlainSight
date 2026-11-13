import { render } from 'preact';
import '../../components/ui.css';
import { HostAccessNotice, SettingsForm, t, useSettings } from '../../components/ui';
import { AI_EXPORTER_URL, REPO_URL, SPONSORS_URL } from '../../lib/links';

function Options() {
  const [settings, update] = useSettings();
  if (!settings) return null;
  return (
    <main class="stack" style={{ maxWidth: '560px', margin: '32px auto', padding: '0 16px' }}>
      <h1>{t('optionsTitle')}</h1>
      <HostAccessNotice />
      <SettingsForm settings={settings} update={update} />
      <label class="choice">
        <input
          type="checkbox"
          checked={settings.remoteUpdates}
          onChange={(e) => update({ remoteUpdates: e.currentTarget.checked })}
        />
        <span>
          <strong>{t('remoteUpdates')}</strong>
          <span class="muted">{t('remoteUpdatesHint')}</span>
        </span>
      </label>
      <p class="muted">{t('privacyNote')}</p>
      <section class="notice">
        <h2>{t('supportTitle')}</h2>
        <p>{t('supportText')}</p>
        <a href={SPONSORS_URL} target="_blank" rel="noopener">
          {t('supportLink')}
        </a>
      </section>
      {AI_EXPORTER_URL && (
        <p>
          {t('moreFromDeveloper')}:{' '}
          <a href={AI_EXPORTER_URL} target="_blank" rel="noopener">
            {t('aiExporter')}
          </a>
        </p>
      )}
      <p class="muted">
        {t('version', browser.runtime.getManifest().version)} ·{' '}
        <a href={REPO_URL} target="_blank" rel="noopener">
          {t('sourceCode')}
        </a>
      </p>
    </main>
  );
}

render(<Options />, document.getElementById('app')!);
