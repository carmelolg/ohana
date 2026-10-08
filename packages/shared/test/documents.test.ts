import { describe, expect, it } from 'vitest';
import { parseAmount, parseDocumentText, romeParts, type DocType } from '../src';

// Testi simili a quelli che l'OCR restituisce da foto di bollette, referti, ricette, multe e avvisi (con il solito rumore: a capo, spazi, maiuscole).
interface Fx {
  name: string;
  text: string;
  type: DocType;
  label?: string;
  supplier: string | null;
  amount: number | null;
  due: [number, number, number] | null;
  folder: string;
}

const FIXTURES: Fx[] = [
  {
    name: 'bolletta luce Enel',
    text: `ENEL ENERGIA S.p.A.
Bolletta energia elettrica
Codice cliente 123456789  POD IT001E12345678
Periodo di fatturazione: 01/08/2026 - 30/09/2026
Consumi fatturati: 312 kWh
Totale da pagare  € 84,20
Da pagare entro il 15/10/2026
Emessa il 28/09/2026`,
    type: 'bolletta',
    label: 'Bolletta luce',
    supplier: 'Enel Energia',
    amount: 84.2,
    due: [2026, 10, 15],
    folder: 'Bollette',
  },
  {
    name: 'bolletta gas A2A con migliaia',
    text: `A2A Energia
FATTURA GAS NATURALE n. 2026/778812
Punto di riconsegna PDR 14800001234567
Consumo Smc 410
Imponibile 1.020,00 EUR
Totale fattura EUR 1.244,40
Scadenza: 03/11/2026`,
    type: 'bolletta',
    label: 'Bolletta gas',
    supplier: 'A2A',
    amount: 1244.4,
    due: [2026, 11, 3],
    folder: 'Bollette',
  },
  {
    name: 'bolletta acqua con data estesa',
    text: `Gruppo Hera - Servizio idrico integrato
Bolletta n. 55123
Consumi mc 38
Importo da pagare 62,15 €
Scade il 20 novembre 2026`,
    type: 'bolletta',
    label: 'Bolletta acqua',
    supplier: 'Hera',
    amount: 62.15,
    due: [2026, 11, 20],
    folder: 'Bollette',
  },
  {
    name: 'bolletta telefono TIM',
    text: `TIM
Fattura n. 7X00123456 del 05/10/2026
Linea fissa e internet fibra
Totale da pagare € 29,90
Pagamento entro 25/10/2026`,
    type: 'bolletta',
    label: 'Bolletta telefono',
    supplier: 'TIM',
    amount: 29.9,
    due: [2026, 10, 25],
    folder: 'Bollette',
  },
  {
    name: 'multa polizia locale',
    text: `COMUNE DI Napoli
Polizia Locale
VERBALE DI ACCERTAMENTO DI VIOLAZIONE
Violazione art. 142 comma 8 del Codice della Strada
Targa AB123CD
Importo in misura ridotta € 42,00 se pagato entro 5 giorni
Pagamento entro il 30/10/2026`,
    type: 'multa',
    supplier: 'Polizia Locale',
    amount: 42,
    due: [2026, 10, 30],
    folder: 'Multe',
  },
  {
    name: 'referto ecografia',
    text: `OSPEDALE Cardarelli
Reparto di Cardiologia
REFERTO ECOGRAFIA CARDIACA
Paziente: Rossi Mario
Esito: nei limiti della norma. Conclusioni: si consiglia controllo tra 6 mesi.
Dott. Verdi Luigi
Data referto 07/10/2026`,
    type: 'referto',
    supplier: 'Ospedale Cardarelli',
    amount: null,
    due: null,
    folder: 'Referti',
  },
  {
    name: 'referto analisi del sangue',
    text: `Laboratorio Analisi Salus
Referto analisi
Campione prelevato il 12/09/2026
Parametri: emoglobina 14,2 g/dL, glicemia 92 mg/dL
Valori nella norma`,
    type: 'referto',
    supplier: null,
    amount: null,
    due: null,
    folder: 'Referti',
  },
  {
    name: 'ricetta con ticket',
    text: `REGIONE CAMPANIA - SSN
Ricetta dematerializzata NRE 150A0123456789
Prescrizione: Atorvastatina 20 mg cpr
Posologia: 1 cpr al giorno
Esenzione: nessuna
Ticket € 36,15`,
    type: 'ricetta',
    supplier: null,
    amount: 36.15,
    due: null,
    folder: 'Ricette',
  },
  {
    name: 'avviso condominio',
    text: `Condominio Garibaldi
Amministratore: Studio Bianchi
Convocazione assemblea ordinaria
Rata condominiale 3° trimestre
Importo € 185,00
Da versare entro il 10/11/2026`,
    type: 'condominio',
    supplier: 'Condominio Garibaldi',
    amount: 185,
    due: [2026, 11, 10],
    folder: 'Condominio',
  },
  {
    name: 'bolletta con OCR sporco (EURO e punti)',
    text: `IREN MERCATO   Bolletta  luce
TOTALE DA PAGARE   EURO 97.60
SCADENZA   12-12-2026
consumi 280 kWh   POD  IT001E000`,
    type: 'bolletta',
    label: 'Bolletta luce',
    supplier: 'Iren',
    amount: 97.6,
    due: [2026, 12, 12],
    folder: 'Bollette',
  },
  {
    name: 'più importi: sceglie quello etichettato',
    text: `Edison Energia
Fattura energia elettrica kWh 150
Spese di trasporto € 12,00
Imposte € 8,40
Totale da pagare € 74,10
Scadenza 08/10/2026`,
    type: 'bolletta',
    label: 'Bolletta luce',
    supplier: 'Edison',
    amount: 74.1,
    due: [2026, 10, 8],
    folder: 'Bollette',
  },
  {
    name: 'bolletta dettagliata: voci intermedie e righe vuote (gli indici non devono sfasarsi)',
    text: `ENEL ENERGIA

Bolletta energia elettrica



Dettaglio degli importi
Spesa per la materia energia      € 38,12


Spesa per il trasporto e la gestione del contatore     € 14,03
Spesa per oneri di sistema    € 9,51
Totale servizi di vendita   € 38,12
Totale imposte e IVA        € 12,54
Canone Rai   € 9,00
Prezzo energia 0,1234 €/kWh



TOTALE DA PAGARE     € 84,20

Scadenza  15/10/2026`,
    type: 'bolletta',
    label: 'Bolletta luce',
    supplier: 'Enel Energia',
    amount: 84.2,
    due: [2026, 10, 15],
    folder: 'Bollette',
  },
  {
    name: 'bolletta gas: tanti totali, vince quello da pagare',
    text: `Hera Comm - Fattura gas naturale
Consumo fatturato 410 Smc
Totale servizi di vendita € 71,40
Totale servizi di rete € 22,10
Totale imposte € 31,58
Totale fattura EUR 156,32
Importo da pagare EUR 156,32
Pagabile entro il 02/11/2026`,
    type: 'bolletta',
    label: 'Bolletta gas',
    supplier: 'Hera',
    amount: 156.32,
    due: [2026, 11, 2],
    folder: 'Bollette',
  },
  {
    name: 'etichetta e importo su righe diverse',
    text: `A2A Energia
Fattura energia elettrica kWh 220
Totale da pagare
entro il 20/11/2026
€ 61,75
Spese di spedizione € 1,50`,
    type: 'bolletta',
    label: 'Bolletta luce',
    supplier: 'A2A',
    amount: 61.75,
    due: [2026, 11, 20],
    folder: 'Bollette',
  },
  {
    name: 'prezzi unitari e percentuali non sono importi',
    text: `Iren Mercato bolletta gas
Costo materia prima 0,4567 €/Smc   IVA 22%
Quota fissa 1,23 € / mese
Totale bolletta € 98,40
Scadenza 05/12/2026`,
    type: 'bolletta',
    label: 'Bolletta gas',
    supplier: 'Iren',
    amount: 98.4,
    due: [2026, 12, 5],
    folder: 'Bollette',
  },
  {
    name: 'documento non riconosciuto',
    text: `Garanzia lavatrice
Acquistata da MediaMarket
Validità 24 mesi`,
    type: 'altro',
    supplier: null,
    amount: null,
    due: null,
    folder: 'Altro',
  },
];

describe('lettura documenti (OCR → campi)', () => {
  for (const f of FIXTURES) {
    it(f.name, () => {
      const r = parseDocumentText(f.text);
      expect(r.docType).toBe(f.type);
      if (f.label) {
        expect(r.docLabel).toBe(f.label);
      }
      expect(r.supplier).toBe(f.supplier);
      expect(r.amount).toBe(f.amount);
      expect(r.folder).toBe(f.folder);
      if (f.due) {
        expect(r.dueDate).not.toBeNull();
        const p = romeParts(r.dueDate!);
        expect([p.y, p.m, p.d]).toEqual(f.due);
        expect(r.found.dueDate).toBe(true);
      } else {
        expect(r.dueDate).toBeNull();
      }
    });
  }

  it("i campi non letti sono segnalati (l'utente corregge toccando)", () => {
    const r = parseDocumentText('Garanzia lavatrice acquistata');
    expect(r.found).toEqual({ type: false, supplier: false, amount: false, dueDate: false });
  });
});

describe('altre cifre trovate (da proporre quando la scelta è sbagliata)', () => {
  it('elenca i candidati dal più probabile e include il totale giusto', () => {
    const r = parseDocumentText(
      `Enel Energia bolletta luce kWh\nTotale imposte € 12,54\nTotale servizi di vendita € 38,12\nTotale da pagare € 84,20`,
    );
    expect(r.amount).toBe(84.2);
    expect(r.amountCandidates[0]).toBe(84.2);
    expect(r.amountCandidates).toEqual(expect.arrayContaining([38.12, 12.54]));
    expect(r.found.amount).toBe(true);
  });
  it('senza etichette sicure non si dichiara sicuro, ma offre le alternative', () => {
    const r = parseDocumentText('Enel bolletta luce kWh 120\n€ 12,50 € 40,00 € 8,00');
    expect(r.found.amount).toBe(false);
    expect(r.amountCandidates).toEqual(expect.arrayContaining([12.5, 40, 8]));
  });
});

describe('importi', () => {
  it.each([
    ['84,20', 84.2],
    ['1.234,56', 1234.56],
    ['84.20', 84.2],
    ['1.000', null],
    ['abc', null],
    ['0,00', null],
  ])('%s → %s', (raw, out) => {
    expect(parseAmount(raw)).toBe(out);
  });
});
