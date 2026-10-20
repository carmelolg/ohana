import { describe, expect, it } from 'vitest';
import { isNetworkBusy, trackBusy } from './busy';

describe('trackBusy', () => {
  it('è attivo durante l’operazione e si spegne al termine', async () => {
    let during = false;
    await trackBusy(async () => {
      during = isNetworkBusy();
    });
    expect(during).toBe(true);
    expect(isNetworkBusy()).toBe(false);
  });

  it('si spegne anche se l’operazione fallisce, altrimenti la rotellina resterebbe accesa', async () => {
    await expect(
      trackBusy(async () => {
        throw new Error('rete assente');
      }),
    ).rejects.toThrow('rete assente');
    expect(isNetworkBusy()).toBe(false);
  });

  it('più operazioni in parallelo restano attive finché non finiscono tutte', async () => {
    let release: () => void = () => undefined;
    const slow = trackBusy(() => new Promise<void>((resolve) => (release = resolve)));
    const fast = trackBusy(async () => undefined);
    await fast;
    expect(isNetworkBusy()).toBe(true);
    release();
    await slow;
    expect(isNetworkBusy()).toBe(false);
  });
});
