import { expect, test } from '@playwright/test';
import { joinSpace, newContext, onboard, openNew, openSpaces, uniqueEmail, login } from './helpers';

test.describe.configure({ mode: 'serial' });

test('login, onboarding e creazione impegno con aggiunta rapida', async ({ page }) => {
  await onboard(page, uniqueEmail('ana'), 'Ana', 'Casa mia');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Cardiologo domani alle 15 ricordamelo 2 giorni prima');
  // i campi riconosciuti compaiono subito
  await expect(page.getByLabel('Data e ora')).toHaveValue(/T15:00$/);
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Visita');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await page.goto('/calendario');
  await expect(page.getByText('Cardiologo').first()).toBeVisible();
});

test("isolamento tra spazi: l'invitato vede solo lo spazio a cui è invitato", async ({ browser }) => {
  const owner = await newContext(browser);
  const guest = await newContext(browser);
  const ownerEmail = uniqueEmail('owner');
  const guestEmail = uniqueEmail('guest');

  await onboard(owner.page, ownerEmail, 'Owner', 'Casa mia');
  // evento privato in «Casa mia»
  await openNew(owner.page);
  await owner.page.getByLabel('Descrivi l’impegno').fill('Segreto di casa domani alle 10');
  await owner.page.getByRole('button', { name: 'Salva' }).click();
  // secondo spazio e invito
  await openSpaces(owner.page);
  await owner.page.getByRole('button', { name: '+ Nuovo spazio' }).click();
  await owner.page.getByLabel('Nome dello spazio').fill('Mamma e papà');
  await owner.page.getByRole('button', { name: 'Crea', exact: true }).click();
  await openSpaces(owner.page);
  await owner.page.getByRole('button', { name: 'Invita persone' }).click();
  await owner.page.getByLabel('Email da invitare').fill(guestEmail);
  await owner.page.getByRole('button', { name: 'Crea link d’invito' }).click();
  const link = await owner.page.getByTestId('invite-link').first().innerText();
  const token = link.split('/invito/')[1];
  expect(token).toBeTruthy();

  await login(guest.page, guestEmail, `/invito/${token}`);
  await guest.page.getByRole('button', { name: /Entra in Mamma e papà/ }).click();
  await expect(guest.page).toHaveURL(/\/oggi/);
  await openSpaces(guest.page);
  const sheet = guest.page.getByRole('dialog', { name: 'I tuoi spazi' });
  await expect(sheet.getByText('Mamma e papà')).toBeVisible();
  await expect(sheet.getByText('Casa mia')).toHaveCount(0);
  await guest.page.keyboard.press('Escape');
  await guest.page.goto('/calendario');
  await expect(guest.page.getByText('Segreto di casa')).toHaveCount(0);
});

test('lista spesa in tempo reale su due browser', async ({ browser }) => {
  const a = await newContext(browser);
  const b = await newContext(browser);
  const guestEmail = uniqueEmail('rt2');
  await onboard(a.page, uniqueEmail('rt1'), 'Giulia', 'Casa mia');

  await joinSpace(a.page, b.page, guestEmail);

  await a.page.goto('/spesa');
  await b.page.goto('/spesa');
  await a.page.getByRole('button', { name: 'Crea la prima lista' }).click();
  await a.page.getByLabel('Nome lista').fill('Supermercato');
  await a.page.getByRole('button', { name: 'Crea', exact: true }).click();
  await expect(b.page.getByRole('button', { name: /Supermercato/ })).toBeVisible({ timeout: 10_000 });
  await a.page.getByLabel('Aggiungi alla spesa').fill('latte, 2 pane, uova x6');
  await a.page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await expect(b.page.getByRole('checkbox', { name: 'Latte' })).toBeVisible({ timeout: 10_000 });
  await expect(b.page.getByRole('checkbox', { name: 'Pane' })).toBeVisible();
  // presenza: Giulia vede che l'altro è nella lista
  await expect(a.page.getByText(/nella lista/)).toBeVisible({ timeout: 10_000 });
  await b.page.getByRole('checkbox', { name: 'Latte' }).click();
  await expect(a.page.getByRole('checkbox', { name: 'Latte' })).toHaveAttribute('aria-checked', 'true', {
    timeout: 10_000,
  });
});

test("categoria personalizzata riconosciuta dall'aggiunta rapida", async ({ page }) => {
  await onboard(page, uniqueEmail('cat'), 'Cate', 'Casa mia');
  await openSpaces(page);
  await page.getByRole('button', { name: 'Invita persone' }).click(); // apre le impostazioni dello spazio
  await page.getByLabel('Nome nuova categoria').fill('Animali');
  await page.getByLabel('Parole chiave nuova categoria').fill('veterinario, cane');
  await page.getByRole('button', { name: 'Aggiungi categoria' }).click();
  await expect(page.getByLabel('Nome categoria Animali')).toBeVisible();
  await page.goto('/oggi');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Vaccino del cane dal veterinario domani alle 10');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Animali');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await page.goto('/calendario');
  await expect(page.getByText('Animali').first()).toBeVisible();
});

test('soprannome: gli altri vedono solo quello', async ({ browser }) => {
  const a = await newContext(browser);
  const b = await newContext(browser);
  const guestEmail = uniqueEmail('nick');
  await onboard(a.page, uniqueEmail('own'), 'Anna', 'Casa mia');
  await joinSpace(a.page, b.page, guestEmail);
  await b.page.goto('/impostazioni');
  await b.page.getByLabel('Nome', { exact: true }).fill('Giuseppe');
  await b.page.getByLabel('Nome', { exact: true }).blur();
  await b.page.getByLabel('Soprannome').fill('Zio Pino');
  await Promise.all([
    // attende il salvataggio vero prima di guardare dall'altro lato
    b.page.waitForResponse(
      (r) => r.url().includes('/rest/v1/profiles') && r.request().method() === 'PATCH' && r.ok(),
    ),
    b.page.getByLabel('Soprannome').blur(),
  ]);
  await a.page.goto('/oggi');
  await openSpaces(a.page);
  await a.page.getByRole('button', { name: 'Invita persone' }).click();
  await expect(a.page.getByText('Zio Pino')).toBeVisible({ timeout: 10_000 });
  await expect(a.page.getByText('Giuseppe')).toHaveCount(0);
});

test('luogo: selettore stile mappe con suggerimenti vicini alla posizione', async ({ browser }) => {
  const ctx = await browser.newContext({
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    permissions: ['geolocation'],
    geolocation: { latitude: 40.8518, longitude: 14.2681 },
  });
  const page = await ctx.newPage();
  const searches: string[] = [];
  await page.route('https://photon.komoot.io/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/reverse')) {
      return r.fulfill({
        json: {
          features: [
            {
              geometry: { coordinates: [14.2681, 40.8518] },
              properties: { street: 'Via Toledo', housenumber: '1', postcode: '80134', city: 'Napoli' },
            },
          ],
        },
      });
    }
    searches.push(u.search);
    return r.fulfill({
      json: {
        features: [
          {
            geometry: { coordinates: [14.2268, 40.8518] },
            properties: {
              name: 'Ospedale Cardarelli',
              street: 'Via Antonio Cardarelli',
              housenumber: '9',
              postcode: '80131',
              city: 'Napoli',
            },
          },
        ],
      },
    });
  });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await onboard(page, uniqueEmail('loc'), 'Luca', 'Casa mia');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Cardiologo domani alle 9');
  await page.getByRole('button', { name: 'Luogo', exact: true }).click();
  await page.getByRole('button', { name: 'Scegli luogo sulla mappa' }).click();
  const picker = page.getByRole('dialog', { name: 'Scegli il luogo' });
  await expect(picker).toBeVisible();
  await picker.getByRole('combobox').fill('cardarelli');
  await picker.getByRole('option', { name: /Ospedale Cardarelli/ }).click();
  await expect(picker.getByText('Ospedale Cardarelli, Via Antonio Cardarelli 9').first()).toBeVisible();
  // la ricerca è sbilanciata verso il punto in cui si trova l'utente / la mappa (Napoli), non verso un centro fisso
  expect(searches.length).toBeGreaterThan(0);
  expect(searches.every((u) => !new URLSearchParams(u).has('lang'))).toBe(true); // Photon risponde 400 a lang=it
  // appena la posizione è nota la ricerca viene ripetuta attorno a lei, limitata a un riquadro (bbox) vicino
  await expect
    .poll(() =>
      searches.some((u) => {
        const q = new URLSearchParams(u);
        return (
          q.has('bbox') &&
          Math.abs(Number(q.get('lat')) - 40.85) < 0.5 &&
          Math.abs(Number(q.get('lon')) - 14.27) < 0.5
        );
      }),
    )
    .toBe(true);
  await picker.getByRole('button', { name: 'Conferma luogo' }).click();
  await expect(page.getByRole('img', { name: 'Mappa del luogo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Indicazioni' })).toHaveAttribute(
    'href',
    /directions\?to=40\.8518%2C14\.2268/,
  );
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await page.goto('/calendario');
  await page.getByText('Cardiologo').first().click();
  await expect(page.getByText('Ospedale Cardarelli').first()).toBeVisible();
  await expect(page.getByRole('img', { name: 'Mappa del luogo' })).toBeVisible();
  await ctx.close();
});

test("nuova categoria e conferme usano i dialoghi dell'app, non quelli del browser", async ({ page }) => {
  page.on('dialog', (d) => {
    throw new Error('Dialogo nativo del browser: ' + d.message());
  });
  await onboard(page, uniqueEmail('dlg'), 'Dora', 'Casa mia');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Riunione di condominio domani alle 18');
  await page.getByLabel('Categoria').selectOption({ label: '＋ Nuova categoria…' });
  const dlg = page.getByRole('dialog', { name: 'Nuova categoria' });
  await expect(dlg).toBeVisible();
  await dlg.getByLabel('Nome').fill('Condominio');
  await dlg.getByRole('button', { name: 'Crea' }).click();
  await expect(dlg).toBeHidden();
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Condominio');
  // Escape annulla senza creare
  await page.getByLabel('Categoria').selectOption({ label: '＋ Nuova categoria…' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Nuova categoria' })).toBeHidden();
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  // elimina impegno con conferma
  await page.goto('/calendario');
  await page.getByText('Riunione di condominio').first().click();
  await page.getByRole('button', { name: 'Elimina', exact: true }).click();
  const conf = page.getByRole('alertdialog', { name: 'Eliminare questo impegno?' });
  // (sopra: il primo click apre la conferma)
  await expect(conf).toBeVisible();
  await conf.getByRole('button', { name: 'Annulla' }).click();
  await expect(conf).toBeHidden();
  await page.getByRole('button', { name: 'Elimina', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();
  await expect(page.getByText('Impegno eliminato')).toBeVisible();
});

test("categoria creata per errore: si elimina dall'editor e dalle impostazioni", async ({ page }) => {
  await onboard(page, uniqueEmail('del'), 'Dino', 'Casa mia');
  await openNew(page);
  await page.getByLabel('Descrivi l’impegno').fill('Prova sbagliata domani alle 11');
  await page.getByLabel('Categoria').selectOption({ label: '＋ Nuova categoria…' });
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByLabel('Nome').fill('Sbagliata');
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByRole('button', { name: 'Crea' }).click();
  await page.getByRole('button', { name: 'Elimina categoria «Sbagliata»' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();
  await expect(page.getByLabel('Categoria').locator('option', { hasText: 'Sbagliata' })).toHaveCount(0);
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Altro');
  // le predefinite non hanno il pulsante
  await expect(page.getByRole('button', { name: /Elimina categoria/ })).toHaveCount(0);

  // dalle impostazioni dello spazio, con impegni già assegnati
  await page.getByLabel('Categoria').selectOption({ label: '＋ Nuova categoria…' });
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByLabel('Nome').fill('Altra svista');
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByRole('button', { name: 'Crea' }).click();
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await openSpaces(page);
  await page.getByRole('button', { name: 'Invita persone' }).click();
  await page.getByRole('button', { name: 'Elimina Altra svista' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Elimina' }).click();
  await expect(page.getByLabel('Nome categoria Altra svista')).toHaveCount(0);
  await page.goto('/calendario');
  await page.getByText('Prova sbagliata').first().click();
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Altro'); // l'impegno è passato ad «Altro»
});

test('barra superiore a tutta larghezza, indipendente dal contenuto, con filetto sul corpo', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('nav'), 'Nora', 'Casa mia');
  const vw = page.viewportSize()!.width;
  const bar = page.locator('header.navbar');
  for (const path of ['/oggi', '/calendario', '/spesa', '/impostazioni']) {
    await page.goto(path);
    await expect(bar).toBeVisible();
    const box = (await bar.boundingBox())!;
    expect(Math.round(box.x)).toBe(0);
    expect(Math.round(box.width)).toBe(vw); // larghezza piena a prescindere dalla pagina
    expect(await bar.evaluate((el) => getComputedStyle(el).borderBottomWidth)).toBe('1px'); // divisorio con il corpo
  }
  // rimane in alto durante lo scroll
  await page.goto('/oggi');
  await page.evaluate(() => window.scrollTo(0, 2000));
  expect(Math.round((await bar.boundingBox())!.y)).toBe(0);
});

test("rubrica: l'indirizzo del contatto si sceglie su mappa come per l'impegno", async ({ page }) => {
  await page.route('https://photon.komoot.io/**', (r) => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/reverse')) {
      return r.fulfill({ json: { features: [] } });
    }
    return r.fulfill({
      json: {
        features: [
          {
            geometry: { coordinates: [14.2268, 40.8518] },
            properties: {
              name: 'Studio Dott. Verdi',
              street: 'Via Cardarelli',
              housenumber: '9',
              postcode: '80131',
              city: 'Napoli',
            },
          },
        ],
      },
    });
  });
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await onboard(page, uniqueEmail('rub'), 'Rita', 'Casa mia');
  await page.goto('/rubrica');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Dott. Verdi');
  await page.getByLabel('Ruolo (es. Cardiologo)').fill('Cardiologo');
  await page.getByRole('button', { name: 'Scegli indirizzo sulla mappa' }).click();
  const picker = page.getByRole('dialog', { name: 'Scegli il luogo' });
  await picker.getByRole('combobox').fill('studio verdi');
  await picker.getByRole('option', { name: /Studio Dott. Verdi/ }).click();
  await picker.getByRole('button', { name: 'Conferma luogo' }).click();
  await expect(page.getByRole('img', { name: 'Mappa del luogo' })).toBeVisible();
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByRole('dialog', { name: 'Contatto' })).toBeHidden();
  const card = page.getByRole('main');
  await expect(card.getByRole('link', { name: 'Mappa' })).toHaveAttribute(
    'href',
    /openstreetmap\.org\/\?mlat=40\.8518&mlon=14\.2268/,
  );
  await expect(card.getByRole('link', { name: 'Indicazioni' })).toHaveAttribute(
    'href',
    /directions\?to=40\.8518%2C14\.2268/,
  );
});

test('Esc nel selettore luogo chiude solo il selettore, non la sheet sotto', async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort());
  await onboard(page, uniqueEmail('esc'), 'Elia', 'Casa mia');
  await page.goto('/rubrica');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo' }).click();
  await page.getByRole('button', { name: 'Scegli indirizzo sulla mappa' }).click();
  await expect(page.getByRole('dialog', { name: 'Scegli il luogo' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Scegli il luogo' })).toBeHidden();
  await expect(page.getByRole('dialog', { name: 'Contatto' })).toBeVisible();
});

test("mobile: l'area attiva resta evidenziata nelle sue sottopagine; testata dell'editor fissa", async ({
  page,
}) => {
  await onboard(page, uniqueEmail('tab'), 'Tina', 'Casa mia');
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  if (mobile) {
    const tabs = page.getByRole('navigation', { name: 'Navigazione principale' });
    const areas: [string, string][] = [
      ['/casa', 'Casa'],
      ['/spese', 'Casa'],
      ['/famiglia', 'Famiglia'],
      ['/rubrica', 'Famiglia'],
      ['/impostazioni', 'Famiglia'],
      ['/calendario', 'Agenda'],
    ];
    for (const [path, area] of areas) {
      await page.goto(path);
      await expect(tabs.getByRole('link', { name: area })).toHaveAttribute('aria-current', 'page');
      await expect(tabs.getByRole('link', { name: 'Oggi' })).not.toHaveAttribute('aria-current', 'page');
      expect(
        await tabs
          .getByRole('link', { name: area })
          .evaluate((el) => Number(getComputedStyle(el).fontWeight)),
      ).toBeGreaterThanOrEqual(700);
    }
    await page.goto('/oggi');
    await expect(tabs.getByRole('link', { name: 'Oggi' })).toHaveAttribute('aria-current', 'page');
    await expect(tabs.getByRole('link', { name: 'Famiglia' })).not.toHaveAttribute('aria-current', 'page');
    // da Rubrica si torna a Oggi con la tab «Oggi»
    await page.goto('/rubrica');
    await tabs.getByRole('link', { name: 'Oggi' }).click();
    await expect(page).toHaveURL(/\/oggi/);
  }

  // testata «Annulla · Nuovo impegno · Salva» sempre visibile anche con la pagina scrollata
  await page.goto('/oggi');
  await openNew(page);
  for (let i = 0; i < 25; i++) {
    await page
      .getByRole('button', { name: /Voce|Checklist/ })
      .first()
      .click()
      .catch(() => undefined);
  }
  await page.getByRole('button', { name: '+ Checklist' }).click();
  for (let i = 0; i < 20; i++) {
    await page.getByRole('button', { name: 'Voce', exact: true }).click();
  }
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const head = page.locator('.editor-head');
  const expectedTop = mobile
    ? 0
    : await page.locator('header.navbar').evaluate((el) => Math.round(el.getBoundingClientRect().height));
  const box = (await head.boundingBox())!;
  expect(Math.abs(Math.round(box.y) - expectedTop)).toBeLessThanOrEqual(1);
  await expect(head.getByRole('button', { name: 'Annulla' })).toBeInViewport();
  await expect(head.getByRole('button', { name: 'Salva' })).toBeInViewport();
});

test("navigazione: menu dell'avatar, ricerca anche su mobile, indietro sicuro", async ({ page }) => {
  await onboard(page, uniqueEmail('navg'), 'Nico', 'Casa mia');
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  const header = page.locator('header.navbar');

  // menu dell'avatar: apre, naviga con tastiera, Esc chiude e restituisce il focus
  const trigger = header.getByRole('button', { name: 'Menu del profilo' });
  await trigger.click();
  const menu = page.getByRole('menu', { name: 'Profilo' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem')).toHaveText([/Profilo e impostazioni/, /Spazi e inviti/, /Esci/]);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(5, 400); // clic fuori
  await expect(menu).toBeHidden();

  await trigger.click();
  await menu.getByRole('menuitem', { name: 'Spazi e inviti' }).click();
  await expect(page.getByRole('dialog', { name: 'I tuoi spazi' })).toBeVisible();
  await page.keyboard.press('Escape');

  await trigger.click();
  await menu.getByRole('menuitem', { name: 'Profilo e impostazioni' }).click();
  await expect(page).toHaveURL(/\/impostazioni/);
  if (mobile) {
    await page.getByRole('button', { name: 'Indietro' }).click();
    await expect(page).toHaveURL(/\/oggi/);
    // Rubrica: «‹ Famiglia» riporta all'area Famiglia
    await page.goto('/rubrica');
    await page.getByRole('link', { name: 'Famiglia' }).first().click();
    await expect(page).toHaveURL(/\/famiglia/);
  }

  // ricerca raggiungibile anche su mobile (prima solo da tastiera)
  await page.goto('/oggi');
  await header.getByRole('button', { name: 'Cerca' }).click();
  await expect(page.getByRole('dialog', { name: 'Cerca' })).toBeVisible();
  await page.keyboard.press('Escape');

  // «Annulla» da un link diretto non esce dall'app
  await page.goto('/nuovo');
  await page.getByRole('button', { name: 'Annulla' }).click();
  await expect(page).toHaveURL(/\/oggi/);

  // Esci
  await trigger.click();
  await menu.getByRole('menuitem', { name: 'Esci' }).click();
  await expect(page.getByRole('button', { name: 'Ricevi il link per entrare' })).toBeVisible();
});

test('logo nella barra superiore: sempre visibile, porta a Oggi, non rompe il layout con nomi lunghi', async ({
  page,
}) => {
  await onboard(
    page,
    uniqueEmail('logo'),
    'Lia',
    'Casa al mare di nonna Maria e zio Pino con tutti i cugini',
  );
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  const header = page.locator('header.navbar');
  const logo = header.getByRole('link', { name: 'Ohana, vai a Oggi' });
  await expect(logo).toBeVisible();
  await expect(logo.locator('img')).toBeVisible();
  const box = (await logo.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); // area di tocco minima
  expect(box.height).toBeGreaterThanOrEqual(44);
  // su mobile solo il simbolo, su desktop anche il nome
  await expect(logo.getByText('Ohana', { exact: true })).toBeVisible({ visible: !mobile });

  // nessun overflow orizzontale e i comandi a destra restano nello schermo, anche con il nome spazio molto lungo
  const vw = page.viewportSize()!.width;
  expect(await header.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const avatar = (await header.getByRole('button', { name: 'Menu del profilo' }).boundingBox())!;
  expect(avatar.x + avatar.width).toBeLessThanOrEqual(vw);

  // da qualsiasi pagina riporta a Oggi
  for (const path of ['/calendario', '/spesa', '/impostazioni']) {
    await page.goto(path);
    await logo.click();
    await expect(page).toHaveURL(/\/oggi$/);
  }
});
