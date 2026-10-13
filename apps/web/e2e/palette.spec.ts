// La palette è una scelta personale: si applica subito, sopravvive al ricaricamento e non tocca gli altri.
import { expect, test } from '@playwright/test';
import { onboard, uniqueEmail } from './helpers';

test('palette: si sceglie in Impostazioni, si applica subito e resta dopo il ricaricamento', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('palette'), 'Anna', 'Casa mia');
  await page.goto('/impostazioni');

  const palettes = page.getByRole('group', { name: 'Palette' });
  const notte = palettes.getByRole('button', { name: 'Notte' });
  await notte.click();
  await expect(notte).toHaveAttribute('aria-pressed', 'true');

  // Colori di «Notte» (chiaro o scuro, secondo il sistema): il testo cambia rispetto al default.
  const bg = () => page.evaluate(() => document.documentElement.style.getPropertyValue('--bg'));
  await expect.poll(bg).toMatch(/^#(eef2f8|141a24)$/);

  await page.reload();
  await expect(
    page.getByRole('group', { name: 'Palette' }).getByRole('button', { name: 'Notte' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(bg).toMatch(/^#(eef2f8|141a24)$/);
});
