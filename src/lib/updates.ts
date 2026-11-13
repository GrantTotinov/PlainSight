// "Check for updates" in the popup. Asks the browser's own store through
// runtime.requestUpdateCheck (Chrome and Edge, no permission, no request of ours).
// Firefox has no such call and updates add-ons by itself, so the popup links to the store.
export type UpdateCheck =
  | { status: 'update_available'; version?: string }
  | { status: 'no_update' | 'throttled' | 'unsupported' | 'error' };

type RequestUpdateCheck = () => Promise<
  { status: string; version?: string; details?: { version?: string } } | undefined
>;

export async function checkForUpdate(
  request: RequestUpdateCheck | null | undefined = (
    browser.runtime as { requestUpdateCheck?: RequestUpdateCheck }
  ).requestUpdateCheck?.bind(browser.runtime),
): Promise<UpdateCheck> {
  if (typeof request !== 'function') return { status: 'unsupported' };
  try {
    const result = await request();
    switch (result?.status) {
      case 'update_available':
        return { status: 'update_available', version: result.version ?? result.details?.version };
      case 'no_update':
        return { status: 'no_update' };
      case 'throttled':
        return { status: 'throttled' };
      default:
        return { status: 'error' };
    }
  } catch {
    // Unpacked builds and some browser states reject the call.
    return { status: 'error' };
  }
}
