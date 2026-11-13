export type Mode = 'hideAi' | 'webOnly' | 'off';

export interface Settings {
  mode: Mode;
  /** Redirect AI Mode (udm=50) back to regular results. */
  blockAiMode: boolean;
}

export const SCHEMA_VERSION = 1;
export const SETTINGS_KEY = 'settings';
export const MODES: readonly Mode[] = ['hideAi', 'webOnly', 'off'];
export const DEFAULT_SETTINGS: Settings = { mode: 'hideAi', blockAiMode: false };

/**
 * Turns whatever is in storage (nothing, an older schema, or garbage) into valid settings.
 * When the schema changes, bump SCHEMA_VERSION and convert old shapes here before the field checks.
 */
export function migrate(raw: unknown): Settings {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    mode: MODES.includes(s.mode as Mode) ? (s.mode as Mode) : DEFAULT_SETTINGS.mode,
    blockAiMode: typeof s.blockAiMode === 'boolean' ? s.blockAiMode : DEFAULT_SETTINGS.blockAiMode,
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
