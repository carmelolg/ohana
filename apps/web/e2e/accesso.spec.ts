import { expect, test } from '@playwright/test';
import { newContext, onboard, uniqueEmail } from './helpers';

test.describe.configure({ mode: 'serial' });

test("chi ha già uno spazio riapre l'app senza onboarding e senza rifare il login", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  await onboard(page, uniqueEmail('rientro'), 'Rita', 'Casa mia');

  // nuova scheda nello stesso contesto = riapertura dell'app: la sessione salvata basta
  const reopened = await ctx.newPage();
  await reopened.goto('/');
  await expect(reopened).toHaveURL(/\/oggi/);
  await expect(reopened.getByRole('heading', { name: 'Benvenuto' })).toHaveCount(0);
  await expect(reopened.getByLabel('Email')).toHaveCount(0);
  await ctx.close();
});

test("se gli spazi non si caricano non si propone l'onboarding, ma «Riprova»", async ({ browser }) => {
  const { ctx, page } = await newContext(browser);
  await onboard(page, uniqueEmail('offline'), 'Omar', 'Casa mia');

  const reopened = await ctx.newPage();
  // cache locale vuota + rete che non risponde sugli spazi: l'avvio a freddo di un telefono appena installato
  await reopened.route('**/rest/v1/spaces*', (route) => route.abort());
  await reopened.addInitScript(() => indexedDB.deleteDatabase('keyval-store'));
  await reopened.goto('/oggi');
  await expect(
    reopened.getByRole('alert').filter({ hasText: 'Non riesco a caricare i tuoi spazi' }),
  ).toBeVisible();
  await expect(reopened.getByRole('heading', { name: 'Benvenuto' })).toHaveCount(0);

  await reopened.unroute('**/rest/v1/spaces*');
  await reopened.getByRole('button', { name: 'Riprova' }).click();
  await expect(reopened.getByRole('alert').filter({ hasText: 'Non riesco a caricare' })).toHaveCount(0);
  await expect(reopened).toHaveURL(/\/oggi/);
  await ctx.close();
});
