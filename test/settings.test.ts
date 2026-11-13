import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  migrate,
  saveSettings,
  SCHEMA_VERSION,
  SETTINGS_KEY,
} from '../src/lib/settings';

describe('migrate', () => {
  it.each([undefined, null, 'webOnly', 42, [], {}])('falls back to defaults for %j', (raw) => {
    expect(migrate(raw)).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps valid values and repairs invalid ones field by field', () => {
    expect(migrate({ schemaVersion: 1, mode: 'webOnly', blockAiMode: true })).toEqual({
      ...DEFAULT_SETTINGS,
      mode: 'webOnly',
      blockAiMode: true,
    });
    expect(migrate({ mode: 'hideAi', hidePeopleAlsoAsk: true, remoteUpdates: false })).toEqual({
      ...DEFAULT_SETTINGS,
      hidePeopleAlsoAsk: true,
      remoteUpdates: false,
    });
    expect(migrate({ schemaVersion: 1, mode: 'aiOnly', blockAiMode: 'yes' })).toEqual(
      DEFAULT_SETTINGS,
    );
  });

  it('drops unknown fields', () => {
    expect(migrate({ mode: 'off', blockAiMode: false, extra: 1 })).toEqual({
      ...DEFAULT_SETTINGS,
      mode: 'off',
    });
  });
});

describe('storage', () => {
  beforeEach(() => fakeBrowser.reset());

  it('returns defaults when nothing is stored', async () => {
    expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('saves a patch with the schema version', async () => {
    await saveSettings({ mode: 'webOnly' });
    await saveSettings({ blockAiMode: true });
    expect(await loadSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      mode: 'webOnly',
      blockAiMode: true,
    });
    const stored = await fakeBrowser.storage.sync.get(SETTINGS_KEY);
    expect(stored[SETTINGS_KEY]).toMatchObject({ schemaVersion: SCHEMA_VERSION });
  });
});
