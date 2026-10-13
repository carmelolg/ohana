// Bacheca tra due utenti dello stesso spazio: la nota di uno compare come «nuova» per l'altro, in tempo reale.
import { expect, test } from '@playwright/test';
import { joinSpace, newContext, onboard, openPlus, uniqueEmail } from './helpers';

test('nota in bacheca: badge sulla campanella dell’altro membro, letta all’apertura, mai per l’autore', async ({
  browser,
}) => {
  const owner = await newContext(browser);
  const guest = await newContext(browser);
  await onboard(owner.page, uniqueEmail('bo'), 'Olga', 'Casa mia');
  await joinSpace(owner.page, guest.page, uniqueEmail('bg'));

  const ownerBell = owner.page.locator('header.navbar .bell');
  await expect(ownerBell).toHaveAttribute('aria-label', 'Bacheca');

  // l'ospite pubblica una nota
  const sheet = await openPlus(guest.page);
  await sheet.getByRole('listitem', { name: 'Nota in bacheca' }).click();
  await guest.page.getByLabel('Testo della nota').fill('Il latte è finito');
  await guest.page.getByRole('button', { name: 'Pubblica' }).click();
  await expect(guest.page.getByText('Nota pubblicata in bacheca')).toBeVisible();

  // chi l'ha scritta non la vede come nuova
  await expect(guest.page.locator('header.navbar .bell')).toHaveAttribute('aria-label', 'Bacheca');

  // l'altro membro la vede arrivare senza ricaricare
  await expect(ownerBell).toHaveAttribute('aria-label', 'Bacheca, 1 nuova');

  // aprendo la campanella la nota è evidenziata come nuova e poi risulta letta
  await ownerBell.click();
  const menu = owner.page.getByRole('dialog', { name: 'Ultime note della bacheca' });
  await expect(menu).toContainText('Il latte è finito');
  await expect(menu).toContainText('1 nuove');
  await owner.page.keyboard.press('Escape');
  await expect(ownerBell).toHaveAttribute('aria-label', 'Bacheca'); // la lettura è stata scritta: solo allora si ricarica
  await owner.page.reload();
  await expect(ownerBell).toHaveAttribute('aria-label', 'Bacheca');

  await owner.ctx.close();
  await guest.ctx.close();
});
