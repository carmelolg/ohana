import { expect, test } from '@playwright/test';
import { createFromText, onboard, openPlus, openSpaces, uniqueEmail } from './helpers';

test.describe.configure({ mode: 'serial' });

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

test('«+»: bottom sheet con le cinque voci e il testo libero che riconosce il tipo', async ({ page }) => {
  await onboard(page, uniqueEmail('plus'), 'Pia', 'Casa mia');
  const dialog = await openPlus(page);
  for (const name of [
    'Impegno',
    'Faccenda ricorrente',
    'Scansiona documento',
    'Pratica',
    'Nota in bacheca',
  ]) {
    await expect(dialog.getByRole('listitem', { name })).toBeVisible();
  }
  await expect(dialog.getByText('Il testo libero capisce da solo cosa stai creando.')).toBeVisible();
  const input = dialog.getByLabel('Scrivi o detta cosa vuoi creare');
  await input.fill('plastica ogni giovedì');
  await expect(dialog.getByRole('listitem', { name: 'Faccenda ricorrente' })).toContainText('CONSIGLIATO');
  await input.fill('caldaia ogni anno a novembre');
  await expect(dialog.getByRole('listitem', { name: 'Manutenzione' })).toContainText('CONSIGLIATO');
  await input.fill('ISEE mamma');
  await expect(dialog.getByRole('listitem', { name: 'Pratica' })).toContainText('CONSIGLIATO');
  await input.fill('nota: le chiavi le ho io');
  await expect(dialog.getByRole('listitem', { name: 'Nota in bacheca' })).toContainText('CONSIGLIATO');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('faccenda dal «+» con testo libero: blocco in Oggi, spunta, rinviata, filtro', async ({ page }) => {
  await onboard(page, uniqueEmail('fac'), 'Fabio', 'Casa mia');
  await createFromText(page, 'annaffiare le piante ogni 3 giorni');
  await expect(page).toHaveURL(/\/nuovo\?.*tipo=faccenda/);
  await expect(page.getByRole('button', { name: 'Faccenda' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Assegnata a').locator('option:checked')).toHaveText(/Fabio/);
  await expect(page.getByLabel('Ripeti').locator('option:checked')).toHaveText('Ogni 3 giorni');
  await expect(page.getByLabel('Promemoria', { exact: false })).toHaveCount(0); // niente promemoria né email per le faccende
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);

  const block = page.getByRole('region', { name: 'Faccende' });
  await expect(block).toContainText('Faccende · 0 di 1');
  await expect(block.getByText('Annaffiare le piante')).toBeVisible();
  await expect(block).toContainText('ogni 3 gg');
  // non compare tra gli impegni con orario
  await expect(page.locator('.list .row', { hasText: 'Annaffiare le piante' })).toHaveCount(0);

  // spunta → «1 di 1» e barrata; toglie la spunta → torna da fare
  await block.getByRole('checkbox', { name: 'Annaffiare le piante' }).click();
  await expect(block).toContainText('Faccende · 1 di 1');
  await expect(block.getByRole('checkbox', { name: 'Annaffiare le piante' })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await block.getByRole('checkbox', { name: 'Annaffiare le piante' }).click();
  await expect(block).toContainText('Faccende · 0 di 1');

  // una faccenda non fatta ieri passa a oggi come «rinviata» (non come scaduta)
  const y = new Date();
  y.setDate(y.getDate() - 1);
  await createFromText(page, 'lavatrice ogni 2 giorni');
  await page.getByLabel('Giorno').fill(ymd(y));
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);
  await expect(block.getByText('ieri, rinviata')).toBeVisible();
  await expect(page.getByText('In ritardo')).toHaveCount(0);

  // filtro: «solo le tue» / «tutte»
  await block.getByLabel('Filtra le faccende').selectOption('tutte');
  await expect(block).toContainText('Annaffiare le piante');
  await block.getByLabel('Filtra le faccende').selectOption('mie');
});

test('faccenda: assegnatario obbligatorio e niente orario', async ({ page }) => {
  await onboard(page, uniqueEmail('fac2'), 'Gina', 'Casa mia');
  await page.goto('/nuovo?tipo=faccenda');
  await expect(page.getByLabel('Assegnata a').locator('option', { hasText: 'Nessuno' })).toHaveCount(0);
  await expect(page.getByLabel('Data e ora')).toHaveCount(0);
  await expect(page.getByLabel('Giorno')).toBeVisible();
});

test('bacheca: una nota in Oggi, le altre con «+N note»; massimo 280 caratteri', async ({ page }) => {
  await onboard(page, uniqueEmail('bac'), 'Bea', 'Casa mia');
  await createFromText(page, 'nota: le chiavi di casa le ho io fino a domenica');
  const composer = page.getByRole('dialog', { name: 'Nota in bacheca' });
  await expect(composer.getByLabel('Testo della nota')).toHaveValue(
    'le chiavi di casa le ho io fino a domenica',
  );
  await expect(composer.getByLabel('Scadenza').locator('option:checked')).toContainText('dal testo'); // «fino a domenica» riconosciuto
  await composer.getByRole('button', { name: 'Pubblica' }).click();
  const banner = page.getByRole('region', { name: 'Bacheca' });
  await expect(banner).toContainText('le chiavi di casa le ho io fino a domenica');
  await expect(banner).not.toContainText('+1 nota');

  const c2 = await (async () => {
    await openPlus(page);
    await page.getByRole('listitem', { name: 'Nota in bacheca' }).click();
    return page.getByRole('dialog', { name: 'Nota in bacheca' });
  })();
  const ta = c2.getByLabel('Testo della nota');
  await ta.fill('x'.repeat(300));
  await expect(ta).toHaveValue('x'.repeat(280));
  await expect(c2).toContainText('280/280');
  await ta.fill('Pane da prendere');
  await c2.getByRole('button', { name: 'Pubblica' }).click();
  await expect(banner).toContainText('Pane da prendere'); // la più recente
  await expect(banner).toContainText('+1 nota');
  await banner.getByRole('button', { name: /\+1 nota/ }).click();
  await expect(banner).toContainText('le chiavi di casa');
});

test('manutenzione da «+» («caldaia ogni anno a novembre») e card in Altro', async ({ page }) => {
  await onboard(page, uniqueEmail('man'), 'Mara', 'Casa mia');
  await createFromText(page, 'caldaia ogni anno a novembre');
  await expect(page).toHaveURL(/\/manutenzioni/);
  const sheet = page.getByRole('dialog', { name: 'Nuova manutenzione' });
  await expect(sheet.getByLabel('Titolo')).toHaveValue('Revisione caldaia');
  await expect(sheet.getByLabel('Prossima scadenza')).toHaveValue(/-11-01$/);
  await sheet.getByRole('button', { name: 'Aggiungi' }).click();
  await expect(page.getByRole('button', { name: /Revisione caldaia/ })).toContainText('1 NOV');

  // la scadenza è nel calendario come evento di categoria «Scadenza»
  await page.goto('/calendario');
  await page.getByRole('button', { name: 'mese', exact: true }).click();
  // «Segna fatta» chiede il costo (facoltativo) e calcola la successiva
  await page.goto('/manutenzioni');
  await page.getByRole('button', { name: /Revisione caldaia/ }).click();
  await page
    .getByRole('dialog', { name: 'Manutenzione' })
    .getByRole('button', { name: 'Segna fatta' })
    .click();
  const done = page.getByRole('dialog', { name: 'Manutenzione fatta' });
  await done.getByLabel('Costo').fill('90');
  await expect(done).toContainText('La prossima sarà il');
  await done.getByRole('button', { name: 'Conferma' }).click();
  const row = page.getByRole('button', { name: /Revisione caldaia/ });
  await expect(row).toContainText('90 €');
  await expect(row).toContainText('Ultima');

  // Altro: la card mostra lo stato
  await page.goto('/altro');
  await expect(page.getByRole('link', { name: /^Manutenzioni/ })).toBeVisible();
});

test('pratica ISEE da modello: passaggi, documenti, avanzamento e completamento', async ({ page }) => {
  await onboard(page, uniqueEmail('pra'), 'Pina', 'Casa mia');
  await createFromText(page, 'ISEE mamma');
  await expect(page).toHaveURL(/\/pratiche/);
  const sheet = page.getByRole('dialog', { name: 'Nuova pratica' });
  await expect(sheet.getByRole('button', { name: 'ISEE', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await sheet.getByRole('button', { name: 'Crea pratica' }).click();
  await expect(page).toHaveURL(/\/pratiche\/[0-9a-f-]+/);
  await expect(page.getByRole('heading', { name: 'ISEE mamma' })).toBeVisible();
  await expect(page.getByText('0 di 5 passaggi')).toBeVisible();
  for (const d of ['Carta identità', 'Codice fiscale', 'Saldo c/c 31/12', 'Contratto affitto']) {
    await expect(page.getByRole('button', { name: `Carica ${d}` })).toBeVisible();
  }

  await page.getByRole('checkbox', { name: 'Raccogliere documenti' }).click();
  await page.getByRole('checkbox', { name: 'Prenotare al CAF' }).click();
  await expect(page.getByText('2 di 5 passaggi')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Avanzamento' })).toHaveAttribute('aria-valuenow', '2');

  // un passaggio collegato a un impegno in calendario
  await page.getByRole('button', { name: 'Dettagli: Appuntamento CAF' }).click();
  const step = page.getByRole('dialog', { name: 'Passaggio' });
  const when = new Date(Date.now() + 5 * 86400000);
  await step.getByLabel("Data e ora dell'appuntamento").fill(`${ymd(when)}T10:00`);
  await step.getByRole('button', { name: 'Aggiungi' }).click();
  await expect(page.getByText('è nel calendario')).toBeVisible();

  for (const t of ['Appuntamento CAF', 'Firma DSU', 'Ricevere attestazione']) {
    await page.getByRole('checkbox', { name: t }).click();
  }
  await expect(page.locator('.badge', { hasText: 'COMPLETATA' })).toBeVisible();

  // Altro mostra «N in corso» solo per quelle aperte
  await page.goto('/pratiche');
  await expect(page.getByText('Concluse')).toBeVisible();
});

test("diario visite: com'è andata, prossimi passi → impegno, storico con il medico", async ({ page }) => {
  await onboard(page, uniqueEmail('dia'), 'Dino', 'Casa mia');
  // contatto medico
  await page.goto('/rubrica');
  await page.getByRole('main').getByRole('button', { name: 'Nuovo' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Dott. Rossi');
  await page.getByLabel('Ruolo (es. Cardiologo)').fill('Cardiologo');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page.getByText('Dott. Rossi').first()).toBeVisible();

  await page.goto('/oggi');
  await createFromText(page, 'Visita cardiologica dott. rossi domani alle 9:30');
  await expect(page).toHaveURL(/\/nuovo/);
  await expect(page.getByLabel('Contatto').locator('option:checked')).toContainText('Dott. Rossi');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Visita');
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/oggi/);

  await page.goto('/calendario');
  await page.getByText('Visita cardiologica').first().click();
  await expect(page.getByText('Com’è andata')).toHaveCount(0); // compare solo a visita conclusa
  await page.getByRole('button', { name: 'Segna fatto' }).click();
  await expect(page.getByText('Visita conclusa')).toBeVisible();
  await page.getByRole('button', { name: 'Com’è andata' }).click();

  await page.getByRole('textbox', { name: "Com'è andata" }).fill('Pressione nella norma. Ridurre il sale.');
  await page.getByRole('button', { name: 'Aggiungi nota' }).click();
  await expect(page.getByText('Pressione nella norma. Ridurre il sale.')).toBeVisible();

  // ticket → Spese (apre il modulo con l'impegno collegato)
  await page.getByLabel('Importo del ticket').fill('36,15');
  await page.getByRole('button', { name: /Ticket → Spese/ }).click();
  await expect(page).toHaveURL(/\/spese\?evento=/);
  await expect(page.getByRole('dialog', { name: 'Nuova spesa' })).toBeVisible();
  await expect(page.getByLabel('Importo')).toHaveValue('36.15');
  await page.keyboard.press('Escape');
  await page.goBack();

  // prossimi passi → «Crea impegno» apre il form precompilato e poi risulta «nel calendario»
  await page.getByLabel('Nuovo passo').fill('Holter 24 h');
  await page.getByLabel('Quando', { exact: true }).fill('entro 31 dic · da prenotare');
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click();
  await page.getByRole('button', { name: 'Crea impegno: Holter 24 h' }).click();
  await expect(page).toHaveURL(/\/nuovo\?.*followup=/);
  await expect(page.getByLabel('Descrivi l’impegno')).toHaveValue(/Holter 24 h/);
  await expect(page.getByLabel('Data e ora')).toHaveValue(/-12-31T/);
  await page.getByRole('button', { name: 'Salva' }).click();
  await expect(page).toHaveURL(/\/evento\//); // «Salva» riporta alla visita
  await expect(page.getByText('✓ nel calendario')).toBeVisible();

  // storico con lo stesso medico
  await expect(page.getByRole('button', { name: /Storico con Dott\. Rossi/ })).toBeVisible();
});

test('Altro: griglia di card con lo stato; Emergenza in rosso; accessi in massimo 2 tap', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('alt'), 'Ada', 'Casa mia');
  await page.goto('/altro');
  const main = page.getByRole('main');
  for (const n of ['Pratiche', 'Manutenzioni', 'Rubrica', 'Spese', 'Documenti', 'Emergenza']) {
    await expect(main.getByRole('link', { name: new RegExp(`^${n}`) })).toBeVisible();
  }
  await expect(main.getByRole('link', { name: 'Profilo e impostazioni' })).toBeVisible();
  await expect(main.getByRole('link', { name: /Spazi e inviti/ })).toBeVisible();
  const color = await main
    .getByRole('link', { name: /^Emergenza/ })
    .locator('span')
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(color).not.toBe(
    await main
      .getByRole('link', { name: /^Rubrica/ })
      .locator('span')
      .first()
      .evaluate((el) => getComputedStyle(el).color),
  );
  // griglia a due colonne
  const boxes = await Promise.all(
    ['Pratiche', 'Manutenzioni'].map(
      async (n) => (await main.getByRole('link', { name: new RegExp(`^${n}`) }).boundingBox())!,
    ),
  );
  expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2);
});

test("scansione: foto di una bolletta → campi letti dall'OCR → conferma → scadenza creata", async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const due = new Date(Date.now() + 6 * 86400000);
  const dd = `${String(due.getDate()).padStart(2, '0')}/${String(due.getMonth() + 1).padStart(2, '0')}/${due.getFullYear()}`;

  // immagine di esempio: la bolletta viene "fotografata" da una pagina HTML
  const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1100, height: 900 } });
  const shot = await ctx.newPage();
  await shot.setContent(`<body style="margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;padding:50px;width:1000px">
    <div style="font-size:50px;font-weight:700">ENEL ENERGIA S.p.A.</div>
    <div style="font-size:38px;margin-top:20px">Bolletta energia elettrica</div>
    <div style="font-size:32px;margin-top:20px">Codice cliente 123456789</div>
    <div style="font-size:32px;margin-top:10px">Consumi fatturati: 312 kWh</div>
    <div style="font-size:42px;margin-top:30px;font-weight:700">Totale da pagare   € 84,20</div>
    <div style="font-size:38px;margin-top:20px">Da pagare entro il ${dd}</div></body>`);
  const png = await shot.screenshot({ type: 'png', fullPage: true });
  await ctx.close();

  const saves: string[] = [];
  page.on('request', (r) => {
    if (r.method() !== 'GET' && /\/rest\/v1\/(documents|events|attachments)/.test(r.url())) {
      saves.push(r.url());
    }
  });
  await onboard(page, uniqueEmail('scan'), 'Sonia', 'Casa mia');
  const dialog = await openPlus(page);
  await dialog.getByRole('listitem', { name: 'Scansiona documento' }).click();
  await expect(page).toHaveURL(/\/scansiona/);
  await expect(page.getByRole('button', { name: /Scatta una foto/ })).toBeVisible();
  // fotocamera: <input type=file capture=environment>
  await expect(page.getByLabel('Fotocamera')).toHaveAttribute('capture', 'environment');
  await page
    .getByLabel('Foto dalla galleria')
    .setInputFiles({ name: 'bolletta.png', mimeType: 'image/png', buffer: png });

  // letto sul dispositivo: nessuna richiesta a servizi esterni
  const external: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (
      !/^(localhost|127\.0\.0\.1)$/.test(u.hostname) &&
      !u.protocol.startsWith('data') &&
      !u.protocol.startsWith('blob')
    ) {
      external.push(r.url());
    }
  });

  await expect(page.getByText('Ho letto')).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole('button', { name: /^Tipo:/ })).toContainText('Bolletta luce');
  await expect(page.getByRole('button', { name: /^Fornitore:/ })).toContainText('Enel Energia');
  await expect(page.getByRole('button', { name: /^Importo:/ })).toContainText('84,20');
  const fmt = new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(due);
  await expect(page.getByRole('button', { name: /^Scadenza:/ })).toContainText(fmt);
  expect(external.filter((u) => !/fonts\.(googleapis|gstatic)/.test(u))).toEqual([]);

  // finché non si tocca Salva non viene scritto nulla
  expect(saves).toEqual([]);
  await expect(page.getByRole('checkbox', { name: /Crea scadenza e ricordamelo/ })).toHaveAttribute(
    'aria-checked',
    'true',
  );
  await expect(page.getByLabel('Giorni di preavviso')).toHaveValue('3');
  await expect(page.getByLabel('Cartella')).toHaveValue('Bollette');

  // «tocca per correggere»: l'importo si modifica
  await page.getByRole('button', { name: /^Importo:/ }).click();
  await page.getByLabel('Importo', { exact: true }).fill('85,10');
  await expect(page.getByRole('button', { name: /^Importo:/ })).toContainText('85,10');

  await page.getByRole('button', { name: 'Salva', exact: true }).last().click();
  await expect(page.getByText('Salvato: scadenza creata')).toBeVisible({ timeout: 30_000 });
  await expect(page).not.toHaveURL(/scansiona/);

  // scadenza nel calendario con importo e promemoria a 3 giorni
  await page.goto('/calendario');
  await expect(page.getByText('Bolletta luce · Enel Energia').first()).toBeVisible();
  await expect(page.getByText('85,10').first()).toBeVisible();
  await page.getByText('Bolletta luce · Enel Energia').first().click();
  await expect(page.getByLabel('Quando avvisare').locator('option:checked')).toHaveText(/3 giorni prima/);
  // e nei documenti, nella cartella Bollette
  await page.goto('/documenti');
  await expect(page.getByRole('region', { name: 'Bollette' })).toContainText('Bolletta luce · Enel Energia');
});

test('scansione: anche un PDF si sceglie e si legge', async ({ page, browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext();
  const p = await ctx.newPage();
  await p.setContent(
    '<body style="font-family:Arial;padding:40px"><h1 style="font-size:40px">ENEL ENERGIA</h1><p style="font-size:30px">Bolletta energia elettrica</p><p style="font-size:34px"><b>Totale da pagare € 84,20</b></p><p style="font-size:30px">Da pagare entro il 15/12/2026</p></body>',
  );
  const pdf = await p.pdf({ format: 'A4' });
  await ctx.close();
  await onboard(page, uniqueEmail('pdf'), 'Pia', 'Casa mia');
  await page.goto('/scansiona');
  // il campo dedicato accetta solo PDF: così il telefono apre il selettore dei documenti e non solo la galleria
  await expect(page.getByLabel('PDF', { exact: true })).toHaveAttribute('accept', /application\/pdf/);
  await expect(page.getByLabel('PDF', { exact: true })).not.toHaveAttribute('accept', /image/);
  await expect(page.getByRole('button', { name: /Scegli un PDF/ })).toBeVisible();
  await page
    .getByLabel('PDF', { exact: true })
    .setInputFiles({ name: 'bolletta.pdf', mimeType: 'application/pdf', buffer: pdf });
  await expect(page.getByText('Ho letto')).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole('button', { name: /^Tipo:/ })).toContainText('Bolletta luce');
  await expect(page.getByRole('button', { name: /^Importo:/ })).toContainText('84,20');
  await expect(page.getByRole('button', { name: /^Scadenza:/ })).toContainText('15 dic 2026');
});

test('scansione: bolletta con voci intermedie → totale giusto; se sbaglia si sceglie tra le cifre trovate', async ({
  page,
  browser,
}) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({ deviceScaleFactor: 1, viewport: { width: 1100, height: 1100 } });
  const shot = await ctx.newPage();
  await shot.setContent(`<body style="margin:0;background:#fff;color:#000;font-family:Arial;padding:50px;width:1000px;font-size:30px;line-height:1.5">
    <div style="font-size:46px;font-weight:700">ENEL ENERGIA S.p.A.</div>
    <div>Bolletta energia elettrica · consumi 312 kWh</div><br>
    <div>Spesa per la materia energia &nbsp;&nbsp; € 38,12</div>
    <div>Spesa per il trasporto &nbsp;&nbsp; € 14,03</div>
    <div>Totale imposte e IVA &nbsp;&nbsp; € 12,54</div>
    <div>Canone Rai &nbsp;&nbsp; € 9,00</div><br><br>
    <div style="font-weight:700;font-size:38px">Totale da pagare &nbsp; € 84,20</div>
    <div>Scadenza 15/12/2026</div></body>`);
  const png = await shot.screenshot({ type: 'png', fullPage: true });
  await ctx.close();
  await onboard(page, uniqueEmail('tot'), 'Tina', 'Casa mia');
  await page.goto('/scansiona');
  await page
    .getByLabel('Foto dalla galleria')
    .setInputFiles({ name: 'b.png', mimeType: 'image/png', buffer: png });
  await expect(page.getByText('Ho letto')).toBeVisible({ timeout: 180_000 });
  await expect(page.getByRole('button', { name: /^Importo:/ })).toContainText('84,20'); // non 38,12 né 12,54
  // se l'OCR o le regole sbagliano, le altre cifre sono a un tocco di distanza
  await page.getByRole('button', { name: /^Importo:/ }).click();
  await expect(page.getByRole('group', { name: 'Importi trovati' })).toBeVisible();
  await page.getByRole('group', { name: 'Importi trovati' }).getByRole('button', { name: /38,12/ }).click();
  await expect(page.getByRole('button', { name: /^Importo:/ })).toContainText('38,12');
  // il testo letto è consultabile (e copiabile)
  await page.getByText('Mostra il testo letto').click();
  await expect(page.getByLabel("Testo letto dall'OCR")).toContainText('Totale da pagare');
});

test('la categoria impara dalle correzioni (Naive Bayes) e si può azzerare', async ({ page }) => {
  test.setTimeout(120_000);
  await onboard(page, uniqueEmail('nb'), 'Nora', 'Casa mia');
  const create = async (text: string, category?: string) => {
    await createFromText(page, text);
    await expect(page).toHaveURL(/\/nuovo/);
    if (category) {
      const sel = page.getByLabel('Categoria');
      if (!(await sel.locator('option', { hasText: category }).count())) {
        await sel.selectOption({ label: '＋ Nuova categoria…' });
        await page.getByRole('dialog', { name: 'Nuova categoria' }).getByLabel('Nome').fill(category);
        await page
          .getByRole('dialog', { name: 'Nuova categoria' })
          .getByRole('button', { name: 'Crea' })
          .click();
      } else {
        await sel.selectOption({ label: category });
      }
    }
  };
  const save = async () => {
    await page.getByRole('button', { name: 'Salva' }).click();
    await expect(page).toHaveURL(/\/oggi/);
  };

  // le regole non conoscono «allenamento»: proposta «Altro»; l'utente sceglie «Sport» tre volte
  await create('Allenamento Sofia domani alle 17');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Altro');
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.getByLabel('Categoria').selectOption({ label: '＋ Nuova categoria…' });
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByLabel('Nome').fill('Sport');
  await page.getByRole('dialog', { name: 'Nuova categoria' }).getByRole('button', { name: 'Crea' }).click();
  await save();
  await create('Partita Luca sabato alle 10', 'Sport');
  await save();
  await create('Nuoto Sofia domenica alle 9', 'Sport');
  await save();

  // alla quarta propone da solo «Sport», e lo dice
  await createFromText(page, 'Allenamento Luca giovedì alle 18');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Sport', {
    timeout: 15_000,
  });
  await expect(page.getByRole('note')).toContainText('Suggerita da ciò che hai scelto in passato');
  // anche una frase mai vista, con parole già associate
  await page.getByLabel('Descrivi l’impegno').fill('Nuoto Luca lunedì alle 17');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Sport');
  // un'altra scelta dell'utente prevale sul suggerimento
  await page.getByLabel('Categoria').selectOption({ label: 'Altro' });
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annulla' }).click();
  // un testo senza relazione con ciò che ha imparato non viene toccato: restano le regole
  await createFromText(page, 'Cardiologo domani alle 9');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Visita');
  await expect(page.getByRole('note')).toHaveCount(0);
  await page.getByRole('button', { name: 'Annulla' }).click();

  // Impostazioni spazio: contatore e azzeramento
  await openSpaces(page);
  await page.getByRole('button', { name: 'Invita persone' }).click();
  await expect(page.getByText('L’app impara da te')).toBeVisible();
  await expect(page.getByText(/Esempi imparati finora:/)).toContainText(/[3-9]/);
  await page.getByRole('button', { name: 'Azzera apprendimento' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Azzera' }).click();
  await expect(page.getByText(/Esempi imparati finora:/)).toContainText('0');
  await createFromText(page, 'Allenamento Luca giovedì alle 18');
  await expect(page.getByLabel('Categoria').locator('option:checked')).toHaveText('Altro'); // dimenticato
});

test('funzioni per spazio: spegnere «Spesa» e «Spese» le toglie da menu, Altro e indirizzi', async ({
  page,
}) => {
  await onboard(page, uniqueEmail('feat'), 'Ada', 'Genitori');
  await page.goto('/altro');
  await page.getByRole('link', { name: /Spazi e inviti/ }).click();
  await expect(page.getByRole('heading', { name: 'Genitori' })).toBeVisible();
  await page.getByRole('switch', { name: 'Lista della spesa' }).click();
  await expect(page.getByRole('switch', { name: 'Lista della spesa' })).not.toBeChecked();
  await page.getByRole('switch', { name: 'Spese e saldi' }).click();
  await expect(page.getByRole('switch', { name: 'Spese e saldi' })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: 'Lista della spesa' })).not.toBeChecked();

  await page.goto('/altro');
  const main = page.getByRole('main');
  await expect(main.getByRole('link', { name: /^Emergenza/ })).toBeVisible();
  await expect(main.getByRole('link', { name: /^Spese/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^Spesa$/ })).toHaveCount(0);

  await page.goto('/spesa');
  await expect(page).toHaveURL(/\/oggi/);

  // riaccesa, torna tutto
  await page.goto('/altro');
  await page.getByRole('link', { name: /Spazi e inviti/ }).click();
  await page.getByRole('switch', { name: 'Spese e saldi' }).click();
  await expect(page.getByRole('switch', { name: 'Spese e saldi' })).toBeChecked();
  await page.goto('/altro');
  await expect(page.getByRole('main').getByRole('link', { name: /^Spese/ })).toBeVisible();
});
