// Una vista salvata rovinata o in un formato vecchio non deve lasciare la mappa grigia e senza controlli.
import { expect, test } from '@playwright/test';
import { onboard, openNew, uniqueEmail } from './helpers';

for (const bad of [
  '{"c":{"lat":null,"lng":null},"z":null}',
  '{"lat":40,"lng":14,"z":5}',
  '{"c":{"lat":"x"},"z":"y"}',
  'not json',
]) {
  test('mappa: parte anche con una vista salvata non valida ' + bad, async ({ page }) => {
    await page.addInitScript((v) => localStorage.setItem('ohana-map-center', v), bad);
    await onboard(page, uniqueEmail('p'), 'Luca', 'Casa mia');
    await openNew(page);
    await page.getByLabel('Descrivi l’impegno').fill('Cardiologo domani alle 9');
    await page.getByRole('button', { name: 'Scegli luogo sulla mappa' }).click();
    await expect(page.locator('.leaflet-tile-loaded').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.leaflet-control-zoom')).toBeVisible();
  });
}

test('mappa: se i tasselli non si caricano compare un avviso chiaro e si può ancora cercare', async ({
  page,
}) => {
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
  await onboard(page, uniqueEmail('q'), 'Luca', 'Casa mia');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Cardiologo domani alle 9');
  await page.getByRole('button', { name: 'Scegli luogo sulla mappa' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Non riesco a caricare la mappa' })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole('combobox', { name: 'Cerca un indirizzo o un posto' })).toBeVisible();
});
