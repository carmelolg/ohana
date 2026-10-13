// La guida iniziale accompagna tra le schermate vere, compare una volta sola e si può rivedere dal profilo.
import { expect, test } from '@playwright/test';
import { onboard, uniqueEmail } from './helpers';

// Qui la guida non è «già vista» (la configurazione di default la dà per vista).
test.use({ storageState: { cookies: [], origins: [] } });

test('guida: evidenzia le schermate vere, una volta sola, riapribile dal profilo', async ({ page }) => {
  await onboard(page, uniqueEmail('tour'), 'Anna', 'Casa mia');
  const guide = page.getByRole('dialog', { name: 'Guida a Ohana' });
  await expect(guide.getByRole('heading', { name: 'Benvenuto in Ohana' })).toBeVisible();

  const avanti = guide.getByRole('button', { name: 'Avanti' });
  await avanti.click(); // Oggi
  await avanti.click(); // lista
  await avanti.click(); // spazi
  await avanti.click(); // «+»
  await expect(guide.getByRole('heading', { name: 'Il pulsante «+»' })).toBeVisible();
  await avanti.click(); // foglio «+» aperto dal passo
  await expect(page.getByRole('dialog', { name: 'Cosa vuoi creare?' })).toBeVisible();
  await expect(guide.getByRole('heading', { name: 'Scrivi come parli' })).toBeVisible();
  await avanti.click(); // cerca: il foglio si chiude
  await expect(page.getByRole('dialog', { name: 'Cosa vuoi creare?' })).toHaveCount(0);
  await avanti.click(); // campanella
  await avanti.click(); // Agenda
  await avanti.click(); // vista agenda: porta al calendario
  await expect(page).toHaveURL(/\/calendario/);
  await expect(guide.getByRole('heading', { name: 'Scegli la vista' })).toBeVisible();

  await guide.getByRole('button', { name: 'Chiudi la guida' }).click();
  await expect(guide).toHaveCount(0);

  await page.reload();
  await expect(page.locator('header.navbar')).toBeVisible();
  await expect(guide).toHaveCount(0);

  await page.goto('/impostazioni');
  await page.getByRole('button', { name: 'Rivedi la guida' }).click();
  await expect(guide.getByRole('heading', { name: 'Benvenuto in Ohana' })).toBeVisible();
  await expect(page).toHaveURL(/\/oggi/);
});
