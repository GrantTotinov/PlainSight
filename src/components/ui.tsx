import { useEffect, useState } from 'preact/hooks';
import { HOST_PERMISSIONS } from '../lib/hosts';
import {
  loadSettings,
  migrate,
  MODES,
  saveSettings,
  SETTINGS_KEY,
  type Mode,
  type Settings,
} from '../lib/settings';

export type MessageKey = Parameters<typeof browser.i18n.getMessage>[0];
export const t = (key: MessageKey, subs?: string | string[]) => browser.i18n.getMessage(key, subs);

const MODE_TEXT: Record<Mode, [MessageKey, MessageKey]> = {
  hideAi: ['modeHideAi', 'modeHideAiHint'],
  webOnly: ['modeWebOnly', 'modeWebOnlyHint'],
  off: ['modeOff', 'modeOffHint'],
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    void loadSettings().then(setSettings);
    const onChange = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area === 'sync' && SETTINGS_KEY in changes) {
        setSettings(migrate(changes[SETTINGS_KEY]?.newValue));
      }
    };
    browser.storage.onChanged.addListener(onChange);
    return () => browser.storage.onChanged.removeListener(onChange);
  }, []);
  const update = (patch: Partial<Settings>) => {
    setSettings((s) => s && { ...s, ...patch });
    void saveSettings(patch);
  };
  return [settings, update] as const;
}

export function SettingsForm({
  settings,
  update,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
}) {
  return (
    <div class="stack">
      <fieldset class="stack" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend class="muted" style={{ marginBottom: '6px' }}>
          {t('modeLabel')}
        </legend>
        {MODES.map((mode) => (
          <label class="choice" key={mode}>
            <input
              type="radio"
              name="mode"
              checked={settings.mode === mode}
              onChange={() => update({ mode })}
            />
            <span>
              <strong>{t(MODE_TEXT[mode][0])}</strong>
              <span class="muted">{t(MODE_TEXT[mode][1])}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label class="choice">
        <input
          type="checkbox"
          checked={settings.blockAiMode}
          disabled={settings.mode === 'off'}
          onChange={(e) => update({ blockAiMode: e.currentTarget.checked })}
        />
        <span>
          <strong>{t('blockAiMode')}</strong>
          <span class="muted">{t('blockAiModeHint')}</span>
        </span>
      </label>
    </div>
  );
}

/** Firefox lets users withhold or revoke host access. Without it nothing works, so say so. */
export function HostAccessNotice() {
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    void browser.permissions.contains({ origins: HOST_PERMISSIONS }).then((ok) => setMissing(!ok));
  }, []);
  if (!missing) return null;
  const grant = async () => {
    setMissing(!(await browser.permissions.request({ origins: HOST_PERMISSIONS })));
  };
  return (
    <div class="notice row" role="alert">
      <span>{t('hostAccessMissing')}</span>
      <button class="primary" onClick={grant}>
        {t('hostAccessGrant')}
      </button>
    </div>
  );
}
