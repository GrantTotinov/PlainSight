import { SEARCH_HOSTS } from '../lib/hosts';
import type { Message } from '../lib/messages';
import { clearRemote, refreshRemote } from '../lib/remote';
import { buildRules, pauseRule, pauseRuleId } from '../lib/rules';
import { loadSettings, SETTINGS_KEY } from '../lib/settings';
import { loadStats } from '../lib/stats';

export default defineBackground(() => {
  const dnr = browser.declarativeNetRequest;
  const searchHosts = new Set(SEARCH_HOSTS);

  // Serialize async work so overlapping events never interleave reads and writes.
  const makeQueue = () => {
    let queue: Promise<unknown> = Promise.resolve();
    return <T>(task: () => Promise<T>): Promise<T> => {
      const run = queue.then(task, task);
      queue = run.catch(() => {});
      return run;
    };
  };
  const serial = makeQueue();
  // Separate queue: a slow download must never delay rules or the counter.
  const serialRemote = makeQueue();

  const syncRules = () =>
    serial(async () => {
      const existing = await dnr.getDynamicRules();
      await dnr.updateDynamicRules({
        removeRuleIds: existing.map((r) => r.id),
        addRules: buildRules(await loadSettings()),
      });
    });

  const isPaused = async (tabId: number) =>
    (await dnr.getSessionRules()).some((r) => r.id === pauseRuleId(tabId));

  const setPaused = (tabId: number, paused: boolean) =>
    dnr.updateSessionRules({
      removeRuleIds: [pauseRuleId(tabId)],
      addRules: paused ? [pauseRule(tabId)] : [],
    });

  const countHidden = () =>
    serial(async () => {
      const { hiddenCount } = await loadStats();
      await browser.storage.local.set({ hiddenCount: hiddenCount + 1 });
    });

  // Selector updates: at most one download a day, only while the user allows it.
  const updateSelectors = () =>
    serialRemote(async () => {
      if ((await loadSettings()).remoteUpdates) await refreshRemote();
      else await clearRemote();
    });

  browser.runtime.onInstalled.addListener(async ({ reason }) => {
    await syncRules();
    if (reason === 'install') {
      await browser.storage.local.set({ installedAt: Date.now() });
      await browser.tabs.create({ url: browser.runtime.getURL('/welcome.html') });
    }
    await updateSelectors();
  });

  browser.runtime.onStartup.addListener(() => void updateSelectors());

  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && SETTINGS_KEY in changes) {
      void syncRules();
      void updateSelectors();
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => void setPaused(tabId, false));

  // Keyboard shortcut (Alt+Shift+H unless the user changed it): pause or resume the current tab.
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'toggle-tab') return;
    // Without the tabs permission, url is only filled in for Google Search tabs.
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined || !tab.url || !searchHosts.has(new URL(tab.url).hostname)) return;
    await setPaused(tab.id, !(await isPaused(tab.id)));
    await browser.tabs.reload(tab.id);
  });

  browser.runtime.onMessage.addListener((msg: Message, sender, sendResponse) => {
    const tabId = 'tabId' in msg && msg.tabId !== undefined ? msg.tabId : sender.tab?.id;
    const handle = async (): Promise<unknown> => {
      switch (msg.type) {
        case 'isPaused':
          void updateSelectors(); // a Google page just loaded: good moment for the daily check
          return tabId !== undefined && isPaused(tabId);
        case 'setPaused':
          if (tabId !== undefined) await setPaused(tabId, msg.paused);
          return;
        case 'countHidden':
          return countHidden();
      }
    };
    handle().then(sendResponse, (err) => {
      console.error(err);
      sendResponse(undefined);
    });
    return true; // keep the channel open for the async response
  });
});
