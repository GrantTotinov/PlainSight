// Messages sent to the background. `tabId` defaults to the sender's tab (content scripts).
export type Message =
  | { type: 'isPaused'; tabId?: number }
  | { type: 'setPaused'; paused: boolean; tabId?: number }
  | { type: 'countHidden' };

export async function send(msg: { type: 'isPaused'; tabId?: number }): Promise<boolean>;
export async function send(msg: Message): Promise<void>;
export async function send(msg: Message): Promise<unknown> {
  return browser.runtime.sendMessage(msg);
}
