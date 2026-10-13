import { expect, test } from '@playwright/test';
import { onboard, uniqueEmail } from './helpers';

test('calendari: link per Google e Apple, e controlli sull’indirizzo da importare', async ({ page }) => {
  await onboard(page, uniqueEmail('cal'), 'Cleo', 'Casa mia');
  await page.goto('/impostazioni');

  // export: un link per tutti gli spazi, con la versione webcal:// per Apple
  await page.getByRole('button', { name: '+ Tutti gli spazi' }).click();
  await expect(page.getByRole('button', { name: 'Copia link' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Link per Apple' })).toBeVisible();
  await page.getByText('Come si usa').click(); // la spiegazione sta in un riquadro chiuso
  await expect(page.getByText('Gli impegni di Cura compaiono solo come «Impegno di cura»')).toBeVisible();

  // import: indirizzi che non sono un sito pubblico vengono respinti prima di toccare la rete
  const url = page.getByLabel('Indirizzo del calendario (ICS)');
  await page.getByLabel('Nome del calendario').fill('Famiglia');
  await url.fill('http://192.168.1.10/calendario.ics');
  await page.getByRole('button', { name: 'Collega calendario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Indirizzo non valido' })).toBeVisible();

  await page.getByLabel('Nome del calendario').fill('');
  await url.fill('https://esempio.it/calendario.ics');
  await page.getByRole('button', { name: 'Collega calendario' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Dai un nome al calendario' })).toBeVisible();
});
