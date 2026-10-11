import { expect, type Browser, type Page } from '@playwright/test';

const MAIL = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324'; // Mailpit di Supabase locale

/** Accede via magic link leggendo l'email dall'Inbucket di Supabase locale. */
export async function login(page: Page, email: string, redirect = '/') {
  await page.goto(redirect);
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Ricevi il link per entrare' }).click();
  await expect(page.getByText('Link inviato')).toBeVisible();
  const link = await magicLink(page, email);
  await page.goto(link);
}

export async function magicLink(page: Page, email: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    const res = (await (
      await page.request.get(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)
    ).json()) as { messages: { ID: string }[] };
    if (res.messages?.length) {
      const msg = (await (await page.request.get(`${MAIL}/api/v1/message/${res.messages[0].ID}`)).json()) as {
        HTML: string;
        Text: string;
      };
      await page.request.delete(`${MAIL}/api/v1/messages`, { data: { IDs: [res.messages[0].ID] } });
      const m =
        /href="([^"]*\/auth\/v1\/verify[^"]*)"/.exec(msg.HTML) ??
        /(http[^\s"]*\/auth\/v1\/verify[^\s"]*)/.exec(msg.Text);
      if (m) {
        return m[1].replace(/&amp;/g, '&');
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error('Magic link non ricevuto per ' + email);
}

export const uniqueEmail = (p: string) =>
  `${p}${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}@ohana.test`;

export async function onboard(page: Page, email: string, first: string, space: string) {
  await login(page, email);
  await expect(page.getByRole('heading', { name: 'Benvenuto' })).toBeVisible();
  await page.getByLabel('Nome', { exact: true }).fill(first);
  await page.getByLabel('Nome dello spazio').fill(space);
  await page.getByRole('button', { name: 'Inizia' }).click();
  await expect(page).toHaveURL(/\/oggi/);
}

export async function newContext(browser: Browser) {
  const ctx = await browser.newContext({ locale: 'it-IT', timezoneId: 'Europe/Rome' });
  return { ctx, page: await ctx.newPage() };
}

/** Apre il menu «+» (3b): tab centrale su mobile, scorciatoia N su desktop. */
export async function openPlus(page: Page) {
  const dialog = page.getByRole('dialog', { name: 'Cosa vuoi creare?' });
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await expect(page.getByRole('complementary', { name: 'Navigazione' })).toBeVisible(); // la scorciatoia vale solo a shell montata
    await expect(async () => {
      await page.keyboard.press('n');
      await expect(dialog).toBeVisible({ timeout: 1000 });
    }).toPass({ timeout: 10_000 });
  } else {
    await page.getByRole('button', { name: 'Crea nuovo' }).click();
    await expect(dialog).toBeVisible();
  }
  return dialog;
}

/** Apre «Nuovo impegno»: «+» e poi la riga Impegno. */
export async function openNew(page: Page) {
  const dialog = await openPlus(page);
  await dialog.getByRole('listitem', { name: 'Impegno' }).click();
  await expect(page).toHaveURL(/\/nuovo/);
}

/** Scrive nel «+» e conferma con Invio: il testo libero sceglie da solo cosa creare. */
export async function createFromText(page: Page, text: string) {
  const dialog = await openPlus(page);
  await dialog.getByLabel('Scrivi o detta cosa vuoi creare').fill(text);
  await page.keyboard.press('Enter');
}

/** Apre l'elenco spazi: titolo in alto su mobile, «Gestisci spazi» nella sidebar su desktop. */
export async function openSpaces(page: Page) {
  if ((page.viewportSize()?.width ?? 0) >= 1024) {
    await page.getByRole('button', { name: 'Gestisci spazi' }).click();
  } else {
    await page.locator('header.navbar .space-title').click();
  }
  await expect(page.getByRole('dialog', { name: 'I tuoi spazi' })).toBeVisible();
}

/** Il proprietario (già in un'app con uno spazio) invita `guestEmail`; l'ospite accetta nello stesso spazio. */
export async function joinSpace(owner: Page, guest: Page, guestEmail: string) {
  await openSpaces(owner);
  await owner.getByRole('button', { name: 'Invita persone' }).click();
  await owner.getByLabel('Email da invitare').fill(guestEmail);
  await owner.getByRole('button', { name: 'Crea link d’invito' }).click();
  const token = (await owner.getByTestId('invite-link').first().innerText()).split('/invito/')[1];
  await login(guest, guestEmail, `/invito/${token}`);
  await guest.getByRole('button', { name: /Entra in / }).click();
  await expect(guest).toHaveURL(/\/oggi/);
}
