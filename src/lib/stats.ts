// Local-only usage numbers. They never leave the device.
export interface Stats {
  hiddenCount: number;
  installedAt: number;
  reviewPromptDismissed: boolean;
}

export async function loadStats(): Promise<Stats> {
  const s = await browser.storage.local.get([
    'hiddenCount',
    'installedAt',
    'reviewPromptDismissed',
  ]);
  return {
    hiddenCount: typeof s.hiddenCount === 'number' ? s.hiddenCount : 0,
    installedAt: typeof s.installedAt === 'number' ? s.installedAt : Date.now(),
    reviewPromptDismissed: s.reviewPromptDismissed === true,
  };
}
