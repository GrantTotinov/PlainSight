import { describe, expect, it } from 'vitest';
import { checkForUpdate } from '../src/lib/updates';

describe('checkForUpdate', () => {
  it('reports a newer version (Chrome shape)', async () => {
    const request = async () => ({ status: 'update_available', version: '0.3.0' });
    expect(await checkForUpdate(request)).toEqual({ status: 'update_available', version: '0.3.0' });
  });

  it('reads the version from details too', async () => {
    const request = async () => ({ status: 'update_available', details: { version: '1.0.0' } });
    expect(await checkForUpdate(request)).toEqual({ status: 'update_available', version: '1.0.0' });
  });

  it.each([
    ['no_update', 'no_update'],
    ['throttled', 'throttled'],
    ['something_else', 'error'],
  ])('maps %s to %s', async (status, expected) => {
    expect(await checkForUpdate(async () => ({ status }))).toEqual({ status: expected });
  });

  it('says unsupported where the browser has no update check (Firefox)', async () => {
    expect(await checkForUpdate(null)).toEqual({ status: 'unsupported' });
  });

  it('turns a rejected call into an error', async () => {
    expect(await checkForUpdate(() => Promise.reject(new Error('unpacked')))).toEqual({
      status: 'error',
    });
  });
});
