export type Mode = 'hideAi' | 'webOnly' | 'off';

export interface Settings {
  mode: Mode;
  /** Redirect AI Mode (udm=50) back to regular results. */
  blockAiMode: boolean;
  /** Also hide "People also ask": Google now answers almost all of it with AI. Opt-in. */
  hidePeopleAlsoAsk: boolean;
  /** Download selector fixes from GitHub once a day. Disclosed in Options and on the welcome page. */
  remoteUpdates: boolean;
}

export const SCHEMA_VERSION = 1;
export const SETTINGS_KEY = 'settings';
export const MODES: readonly Mode[] = ['hideAi', 'webOnly', 'off'];
export const DEFAULT_SETTINGS: Settings = {
  mode: 'hideAi',
  blockAiMode: false,
  hidePeopleAlsoAsk: false,
  remoteUpdates: true,
};

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

/**
 * Turns whatever is in storage (nothing, an older schema, or garbage) into valid settings.
 * When the schema changes, bump SCHEMA_VERSION and convert old shapes here before the field checks.
 */
export function migrate(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    mode: MODES.includes(s.mode as Mode) ? (s.mode as Mode) : DEFAULT_SETTINGS.mode,
    blockAiMode: bool(s.blockAiMode, DEFAULT_SETTINGS.blockAiMode),
    // Added after 0.1.0 without a schema bump: a missing field simply takes its default.
    hidePeopleAlsoAsk: bool(s.hidePeopleAlsoAsk, DEFAULT_SETTINGS.hidePeopleAlsoAsk),
    remoteUpdates: bool(s.remoteUpdates, DEFAULT_SETTINGS.remoteUpdates),
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await browser.storage.sync.get(SETTINGS_KEY);
  return migrate(stored[SETTINGS_KEY]);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  const next = { ...(await loadSettings()), ...patch };
  await browser.storage.sync.set({ [SETTINGS_KEY]: { schemaVersion: SCHEMA_VERSION, ...next } });
}
