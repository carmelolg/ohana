import { expect, test, type Page } from '@playwright/test';
import {
  createFromText,
  fillInviteProfile,
  joinSpace,
  login,
  newContext,
  onboard,
  uniqueEmail,
} from './helpers';

test.describe.configure({ mode: 'serial' });

interface PersonSpec {
  first: string;
  label: string;
  thread: string;
  specialty: string;
}
const PAPA: PersonSpec = {
  first: 'Giorgio',
  label: 'Papà',
  thread: 'Morbo di Crohn',
  specialty: 'Gastroenterologia',
};

/** Persona assistita con un filone, creati dalle schermate (di default «Papà» con «Morbo di Crohn»). */
async function createCarePerson(page: Page, p: PersonSpec = PAPA) {
  await page.goto('/cura/nuova');
  await page.getByLabel('Nome', { exact: true }).fill(p.first);
  await page.getByLabel('Cognome').fill('Moretti');
  await page.getByLabel('Come la chiamate (es. Papà)').fill(p.label);
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/cura\/[0-9a-f-]{36}$/);
  const personUrl = page.url();
  await page.goto(`${new URL(personUrl).pathname}/filone/nuovo`);
  await page.getByLabel('Nome del filone (es. Tachicardia)').fill(p.thread);
  await page.getByLabel('Specialità').fill(p.specialty);
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('heading', { name: p.thread })).toBeVisible();
  return new URL(personUrl).pathname;
}

/** Visita «gastroenterologa» di domani, segnata come fatta: apre la chiusura della visita (4c). */
async function createVisit(page: Page, careThread?: string) {
  await page.goto('/oggi');
  await createFromText(page, 'Visita gastroenterologa domani alle 11');
  await expect(page).toHaveURL(/\/nuovo/);
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Visita');
  if (careThread) {
    await page.getByLabel('Cura', { exact: true }).selectOption({ label: careThread });
  }
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await page.goto('/calendario');
  await page.getByText('Visita gastroenterologa').first().click();
  await expect(page).toHaveURL(/\/evento\//);
  return page.url();
}

test('Cura: card in Altro, persona, filone, terapia e dose segnata', async ({ page }) => {
  await onboard(page, uniqueEmail('cur'), 'Luca', 'Mamma e papà');
  await page.goto('/famiglia');
  await expect(page.getByRole('main').getByRole('link', { name: /^Cura/ })).toBeVisible();
  await page.getByRole('main').getByRole('link', { name: /^Cura/ }).click();
  await expect(page.getByText('Nessuna persona assistita')).toBeVisible();

  const person = await createCarePerson(page);
  await page.goto(person);
  await expect(page.getByText('Giorgio, papà')).toBeVisible();
  await expect(page.getByRole('link', { name: /Morbo di Crohn/ })).toBeVisible();

  // terapia con un orario: compare tra le dosi di oggi
  await page.goto(`${person}/terapie/nuova`);
  await page.getByLabel('Nome', { exact: true }).fill('Mesalazina');
  await page.getByLabel('Dosaggio (es. 2,5 mg)').fill('800 mg');
  await page.getByLabel('Quante per volta').fill('2');
  await page.getByLabel('Scorta attuale').fill('20');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByText('Mesalazina 800 mg').first()).toBeVisible();

  await page.goto(person);
  const dose = page.getByRole('checkbox', { name: /Mesalazina 800 mg alle 8:00/ });
  await expect(dose).toHaveAttribute('aria-checked', 'false');
  await dose.click();
  await expect(dose).toHaveAttribute('aria-checked', 'true');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: /Mesalazina 800 mg alle 8:00/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
});

test('Cura: chiudi una visita, il tassello va nel filone giusto e nasce il promemoria', async ({ page }) => {
  await onboard(page, uniqueEmail('vis'), 'Luca', 'Mamma e papà');
  const person = await createCarePerson(page);
  await createVisit(page);
  await page.getByRole('button', { name: 'Segna fatto' }).click();
  await expect(page.getByText('Visita conclusa')).toBeVisible();
  await page.getByRole('button', { name: 'Com’è andata' }).click();
  await expect(page).toHaveURL(/\/cura\/visita\//);

  // il filone è proposto dalla specialità («gastroenterologa» → Gastroenterologia)
  await expect(page.getByRole('button', { name: 'Morbo di Crohn' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Cosa ha detto').fill('Calprotectina in calo, situazione stabile.');
  await page.getByLabel('Tra quanti mesi').selectOption('3');
  await page.getByRole('button', { name: 'Salva' }).click();

  await expect(page).toHaveURL(/\/filone\//);
  await expect(page.getByText('Calprotectina in calo, situazione stabile.')).toBeVisible();
  await expect(page.locator('.tl-type', { hasText: 'Visita' })).toBeVisible();

  // il «prossimo controllo» è un impegno vero: lo mostra la card di Altro
  await page.goto('/famiglia');
  await expect(page.getByRole('main').getByRole('link', { name: /^Cura/ })).toContainText(/controllo/i);

  // la scheda del filone ricorda l'ultimo tassello e il prossimo passo
  await page.goto(person);
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByText('Calprotectina in calo, situazione stabile.')).toBeVisible(); // colonna del filone
  } else {
    await expect(page.getByText('Ultimo')).toBeVisible();
    await expect(page.getByText('Prossimo', { exact: true })).toBeVisible();
  }
});

test('Cura: una domanda aggiunta da un secondo utente compare nella preparazione della visita', async ({
  page,
  browser,
}) => {
  await onboard(page, uniqueEmail('prp'), 'Luca', 'Mamma e papà');
  await createCarePerson(page);
  const eventUrl = await createVisit(page, 'Papà · Morbo di Crohn');
  await page.getByRole('link', { name: 'Prepara la visita' }).click();
  await expect(page).toHaveURL(/\/prepara$/);
  const prepUrl = page.url();
  expect(prepUrl.startsWith(eventUrl)).toBe(true);

  const { ctx, page: guest } = await newContext(browser);
  try {
    await page.goto('/oggi'); // l'invito si crea da una schermata con la barra in alto
    await joinSpace(page, guest, uniqueEmail('fra'));
    await guest.goto(new URL(prepUrl).pathname);
    await guest.getByLabel('Nuova domanda').fill('Serve ripetere la colonscopia?');
    await guest.getByRole('button', { name: 'Aggiungi', exact: true }).first().click();
    await expect(guest.getByText('Serve ripetere la colonscopia?')).toBeVisible();

    await page.goto(new URL(prepUrl).pathname);
    await expect(page.getByText('Serve ripetere la colonscopia?')).toBeVisible();
  } finally {
    await ctx.close();
  }
});

test('Cura: chi ha il ruolo «Solo Cura» vede la Cura ma non le Spese', async ({ page, browser }) => {
  await onboard(page, uniqueEmail('cvw'), 'Luca', 'Mamma e papà');
  await createCarePerson(page);

  // invito con ruolo «Solo Cura»
  const guestEmail = uniqueEmail('bad');
  await page
    .getByRole('button', { name: /Mamma e papà/ })
    .first()
    .click()
    .catch(() => undefined);
  await page.keyboard.press('Escape');
  await page.goto('/famiglia');
  await page.getByRole('link', { name: /Spazi e inviti/ }).click();
  await page.getByLabel('Email da invitare').fill(guestEmail);
  await page.getByLabel('Ruolo').selectOption({ label: 'Solo Cura' });
  await page.getByRole('button', { name: 'Crea link d’invito' }).click();
  const token = (await page.getByTestId('invite-link').first().innerText()).split('/invito/')[1];

  const { ctx, page: guest } = await newContext(browser);
  try {
    await login(guest, guestEmail, `/invito/${token}`);
    await fillInviteProfile(guest);
    await guest.getByRole('button', { name: /Entra in / }).click();
    await expect(guest).toHaveURL(/\/oggi/);

    await guest.goto('/famiglia');
    await expect(guest.getByRole('main').getByRole('link', { name: /^Cura/ })).toBeVisible();
    await expect(guest.getByRole('link', { name: /^Spese/ })).toHaveCount(0);
    await guest.goto('/spese');
    await expect(guest).toHaveURL(/\/oggi/); // la funzione è spenta per lui: torna a Oggi

    await guest.goto('/cura');
    await expect(guest.getByText('Giorgio, papà')).toBeVisible();
    await expect(guest.getByRole('link', { name: '+ Nuovo filone' })).toHaveCount(0); // sola consultazione
  } finally {
    await ctx.close();
  }
});

test('Cura: «+ Impegno» dal filone crea un impegno già collegato alla cura', async ({ page }) => {
  await onboard(page, uniqueEmail('imp'), 'Luca', 'Mamma e papà');
  await createCarePerson(page);
  await page.getByRole('link', { name: '+ Impegno' }).click();
  await expect(page).toHaveURL(/\/nuovo\?filone=/);
  await expect(page.getByLabel('Cura', { exact: true }).locator('option:checked')).toHaveText(
    'Papà · Morbo di Crohn',
  );
  await page.getByLabel('Descrivi l’impegno').fill('Esami del sangue domani alle 8');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/filone\//); // «Salva» riporta al filone da cui si era partiti

  // l'impegno è del filone: la card di Altro mostra il prossimo controllo
  await page.goto('/famiglia');
  await expect(page.getByRole('main').getByRole('link', { name: /^Cura/ })).toContainText(/controllo/i);
});

test("Cura: con più persone assistite l'impegno dice sempre a chi appartiene la cura", async ({ page }) => {
  await onboard(page, uniqueEmail('due'), 'Luca', 'Mamma e papà');
  await createCarePerson(page);
  await createCarePerson(page, {
    first: 'Anna',
    label: 'Mamma',
    thread: 'Diabete',
    specialty: 'Diabetologia',
  });

  await page.goto('/nuovo');
  const cura = page.getByLabel('Cura', { exact: true });
  await expect(cura.locator('option')).toContainText(['Nessuna', 'Papà · Morbo di Crohn', 'Mamma · Diabete']);
  await cura.selectOption({ label: 'Mamma · Diabete' });
  await page.getByLabel('Descrivi l’impegno').fill('Controllo glicemia domani alle 9');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);

  // nel calendario la riga dell'impegno indica persona e filone
  await page.goto('/calendario');
  await expect(page.getByRole('link', { name: /Controllo glicemia/ })).toContainText('Mamma · Diabete');
});
