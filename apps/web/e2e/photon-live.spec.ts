import { expect, test } from '@playwright/test';
import { buildSearchUrls, distanceM } from '../src/lib/geocode';

// Verifica contro il servizio REALE (i test normali lo simulano e non accorgerebbero di parametri rifiutati).
// Esegui con:  PHOTON_LIVE=1 npx playwright test --project=live
test.skip(!process.env.PHOTON_LIVE, 'solo con PHOTON_LIVE=1 (usa la rete)');

const NAPOLI = { lat: 40.8518, lng: 14.2681 };
const MILANO = { lat: 45.4642, lng: 9.19 };

for (const [name, near] of [
  ['Napoli', NAPOLI],
  ['Milano', MILANO],
] as const) {
  test(`«via roma» vicino a ${name}: risposta valida e primi risultati nelle vicinanze`, async ({
    request,
  }) => {
    const { local, global } = buildSearchUrls('via roma', near, 13);
    for (const u of [local!, global]) {
      expect((await request.get(u)).status(), u).toBe(200);
    }
    const feats = (
      (await (await request.get(local!)).json()) as {
        features: { geometry: { coordinates: [number, number] } }[];
      }
    ).features;
    expect(feats.length).toBeGreaterThan(0);
    for (const f of feats) {
      expect(
        distanceM(near, { lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }),
      ).toBeLessThan(40_000);
    }
  });
}

test('geocodifica inversa risponde', async ({ request }) => {
  expect(
    (await request.get('https://photon.komoot.io/reverse?lat=40.8518&lon=14.2681&limit=1')).status(),
  ).toBe(200);
});
