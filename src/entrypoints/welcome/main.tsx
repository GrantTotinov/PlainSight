import { render } from 'preact';
import { useState } from 'preact/hooks';
import '../../components/ui.css';
import { HostAccessNotice, t } from '../../components/ui';
import { saveSettings, type Mode } from '../../lib/settings';

// Closing this page without choosing keeps the default (Hide AI).
function Welcome() {
  const [saved, setSaved] = useState<Mode | null>(null);
  const choose = (mode: Mode) => {
    void saveSettings({ mode }).then(() => setSaved(mode));
  };
  const option = (
    mode: Mode,
    title: 'modeHideAi' | 'modeWebOnly',
    hint: 'modeHideAiHint' | 'modeWebOnlyHint',
  ) => (
    <button
      class={saved === mode ? 'choice primary' : 'choice'}
      style={{ textAlign: 'start', display: 'block' }}
      onClick={() => choose(mode)}
      aria-pressed={saved === mode}
    >
      <strong>{t(title)}</strong>
      <span>{t(hint)}</span>
    </button>
  );
  return (
    <main class="stack" style={{ maxWidth: '560px', margin: '48px auto', padding: '0 16px' }}>
      <h1 style={{ fontSize: '22px' }}>{t('welcomeTitle')}</h1>
      <HostAccessNotice />
      <p>{t('welcomeIntro')}</p>
      {option('hideAi', 'modeHideAi', 'modeHideAiHint')}
      {option('webOnly', 'modeWebOnly', 'modeWebOnlyHint')}
      <p class="muted">{t('welcomeDifference')}</p>
      {saved && <p role="status">{t('welcomeSaved')}</p>}
      <p class="muted">{t('privacyNote')}</p>
      <p class="muted">{t('remoteUpdatesHint')}</p>
    </main>
  );
}

render(<Welcome />, document.getElementById('app')!);
