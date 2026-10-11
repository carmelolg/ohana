import { expect, test } from '@playwright/test';
import { onboard, uniqueEmail } from './helpers';

// Gira sulla build di produzione (progetto «prod»): lì c'è il service worker.
test('Emergenza: dati salvati, poi la pagina si apre anche senza rete', async ({ page, context }) => {
  test.setTimeout(120_000);
  await onboard(page, uniqueEmail('emg'), 'Elia', 'Casa mia');

  // lo shortcut dell'icona app punta alla pagina
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.shortcuts.find((s: { name: string }) => s.name === 'Emergenza')?.url).toBe('/emergenza');

  await page.goto('/emergenza');
  await expect(page.getByRole('heading', { name: 'Emergenza' })).toBeVisible();
  await expect(page.getByText('112', { exact: true })).toBeVisible(); // sempre il primo
  const call112 = page.getByRole('link', { name: 'Chiama 112' });
  await expect(call112).toHaveAttribute('href', 'tel:112');

  await page.getByRole('button', { name: 'Aggiungi dati' }).click();
  const sheet = page.getByRole('dialog', { name: 'Modifica emergenza' });
  await sheet.getByRole('button', { name: 'Aggiungi contatto' }).click();
  await sheet.getByLabel('Nome contatto 1').fill('Dott.ssa Neri');
  await sheet.getByLabel('Ruolo contatto 1').fill('Medico di base · lun–ven 9–12');
  await sheet.getByLabel('Telefono contatto 1').fill('081 123 4567');
  await sheet.getByLabel('Indirizzo').fill('Via Garibaldi 14, 2° piano');
  await sheet.getByLabel('Citofono').fill('Moretti · codice 2417');
  await sheet.getByLabel('Allergie').fill('Penicillina');
  await sheet.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByText('Dott.ssa Neri')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chiama Dott.ssa Neri' })).toHaveAttribute(
    'href',
    'tel:0811234567',
  );

  // il service worker prende il controllo e conserva la copia dei dati
  await page.reload();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 20_000 })
    .toBe(true);
  await expect(page.getByText('Dott.ssa Neri')).toBeVisible();
  await expect
    .poll(
      () =>
        page.evaluate(
          async () => !!(await (await caches.open('ohana-emergency-v1')).match('/__emergency.json')),
        ),
      { timeout: 20_000 },
    )
    .toBe(true);
  await page.waitForTimeout(1500); // lascia scrivere la copia della cache delle query

  // senza rete: ricarica la pagina e anche una navigazione nuova
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Emergenza' })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('112', { exact: true })).toBeVisible();
  await expect(page.getByText('Dott.ssa Neri')).toBeVisible();
  await expect(page.getByText('Via Garibaldi 14, 2° piano')).toBeVisible();
  await expect(page.getByText('Moretti · codice 2417')).toBeVisible();
  await expect(page.getByText('Penicillina')).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Senza connessione' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Chiama Dott.ssa Neri' })).toBeVisible();
  await page.goto('/emergenza');
  await expect(page.getByText('Dott.ssa Neri')).toBeVisible({ timeout: 20_000 });

  // al logout la copia sensibile viene cancellata
  await context.setOffline(false);
  await page.goto('/oggi');
  await page.getByRole('button', { name: 'Menu del profilo' }).click();
  await page.getByRole('menuitem', { name: 'Esci' }).click();
  await expect(page.getByRole('button', { name: 'Ricevi il link per entrare' })).toBeVisible();
  expect(
    await page.evaluate(
      async () => !!(await (await caches.open('ohana-emergency-v1')).match('/__emergency.json')),
    ),
  ).toBe(false);
});
