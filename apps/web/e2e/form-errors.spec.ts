// Un campo obbligatorio dimenticato deve produrre un avviso che si vede subito, non in fondo alla pagina.
import { expect, test } from '@playwright/test';
import { onboard, uniqueEmail } from './helpers';

test('impegno senza titolo: l’avviso compare in cima, in vista, e il campo è evidenziato', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('err'), 'Luca', 'Casa mia');
  await page.goto('/nuovo');
  await page.getByRole('button', { name: 'Salva' }).first().click();
  const alert = page.getByRole('alert').filter({ hasText: 'Scrivi un titolo' });
  await expect(alert).toBeVisible();
  await expect(alert).toBeInViewport();
  await expect(page.getByLabel('Descrivi l’impegno')).toHaveAttribute('aria-invalid', 'true');
});

test('Cura: persona senza nome, filone senza titolo e farmaco senza nome mostrano l’avviso in vista', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('err'), 'Luca', 'Mamma e papà');
  await page.goto('/cura/nuova');
  await page.getByRole('button', { name: 'Salva' }).click();
  const alert = page.getByRole('alert').filter({ hasText: 'Scrivi il nome' });
  await expect(alert).toBeInViewport();
  await expect(page.getByLabel('Nome', { exact: true })).toHaveAttribute('aria-invalid', 'true');

  await page.getByLabel('Nome', { exact: true }).fill('Giorgio');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/cura\/[0-9a-f-]{36}$/);
  const person = new URL(page.url()).pathname;

  await page.goto(`${person}/filone/nuovo`);
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Dai un nome al filone' })).toBeInViewport();

  await page.goto(`${person}/terapie/nuova`);
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Scrivi il nome del farmaco' })).toBeInViewport();
});
