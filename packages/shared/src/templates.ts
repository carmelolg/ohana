// Modelli pronti per Manutenzioni e Pratiche.

export interface MaintenanceTemplate {
  key: string;
  title: string;
  /** RRULE della ricorrenza */
  rrule: string;
  /** parole che nel testo libero fanno riconoscere questo modello */
  keywords: string[];
  hint: string;
  /** etichetta breve per i chip «+ Estintore» */
  short: string;
}

export const MAINTENANCE_TEMPLATES: MaintenanceTemplate[] = [
  {
    key: 'caldaia',
    title: 'Revisione caldaia',
    rrule: 'FREQ=YEARLY',
    keywords: ['caldaia'],
    hint: 'ogni anno',
    short: 'Caldaia',
  },
  {
    key: 'gomme',
    title: 'Cambio gomme invernali/estive',
    rrule: 'FREQ=YEARLY;BYMONTH=4,11',
    keywords: ['gomme', 'pneumatici'],
    hint: 'aprile e novembre',
    short: 'Gomme',
  },
  {
    key: 'condizionatore',
    title: 'Pulizia filtri condizionatore',
    rrule: 'FREQ=YEARLY;BYMONTH=5',
    keywords: ['condizionatore', 'climatizzatore', 'filtri'],
    hint: 'ogni maggio',
    short: 'Filtri condizionatore',
  },
  {
    key: 'revisione_auto',
    title: 'Revisione auto',
    rrule: 'FREQ=YEARLY;INTERVAL=2',
    keywords: ['revisione auto', "revisione dell'auto", 'revisione della macchina', 'tagliando'],
    hint: 'ogni 2 anni',
    short: 'Revisione auto',
  },
  {
    key: 'estintore',
    title: 'Controllo estintore',
    rrule: 'FREQ=MONTHLY;INTERVAL=6',
    keywords: ['estintore'],
    hint: 'ogni 6 mesi',
    short: 'Estintore',
  },
  {
    key: 'grondaie',
    title: 'Pulizia grondaie',
    rrule: 'FREQ=YEARLY;BYMONTH=10',
    keywords: ['grondaie', 'grondaia'],
    hint: 'ogni ottobre',
    short: 'Grondaie',
  },
  {
    key: 'decalcificazione',
    title: 'Decalcificazione',
    rrule: 'FREQ=MONTHLY;INTERVAL=3',
    keywords: ['decalcific', 'calcare', 'lavatrice decalc'],
    hint: 'ogni 3 mesi',
    short: 'Decalcificare',
  },
  {
    key: 'canna_fumaria',
    title: 'Pulizia canna fumaria',
    rrule: 'FREQ=YEARLY;BYMONTH=9',
    keywords: ['canna fumaria', 'camino', 'stufa'],
    hint: 'ogni settembre',
    short: 'Canna fumaria',
  },
  {
    key: 'custom',
    title: '',
    rrule: 'FREQ=YEARLY',
    keywords: [],
    hint: 'personalizzata',
    short: 'Personalizzata',
  },
];

export interface ProcedureTemplate {
  key: string;
  title: string;
  keywords: string[];
  steps: string[];
  docs: string[];
}

export const PROCEDURE_TEMPLATES: ProcedureTemplate[] = [
  {
    key: 'isee',
    title: 'ISEE',
    keywords: ['isee', 'dsu'],
    steps: [
      'Raccogliere documenti',
      'Prenotare al CAF',
      'Appuntamento CAF',
      'Firma DSU',
      'Ricevere attestazione',
    ],
    docs: ['Carta identità', 'Codice fiscale', 'Saldo c/c 31/12', 'Contratto affitto'],
  },
  {
    key: '730',
    title: 'Dichiarazione 730',
    keywords: ['730', 'dichiarazione dei redditi', 'modello 730'],
    steps: [
      'Raccogliere CU e spese detraibili',
      'Scegliere CAF o 730 precompilato',
      'Controllare la dichiarazione',
      'Firmare e inviare',
      'Verificare rimborso o F24',
    ],
    docs: ['CU', 'Spese mediche', 'Spese istruzione', 'Mutuo o affitto', 'Codice fiscale'],
  },
  {
    key: 'carta_identita',
    title: "Rinnovo carta d'identità",
    keywords: ["carta d'identit", 'carta identit', 'carta di identit'],
    steps: [
      'Prenotare appuntamento al Comune',
      'Preparare foto e documenti',
      'Presentarsi allo sportello',
      'Ritirare la carta',
    ],
    docs: ['Carta scaduta', '2 foto tessera', 'Codice fiscale', 'Ricevuta di pagamento'],
  },
  {
    key: 'patente',
    title: 'Rinnovo patente',
    keywords: ['patente'],
    steps: ['Visita medica', 'Pagare bollettini', 'Presentare la domanda', 'Ricevere la nuova patente'],
    docs: ['Patente attuale', 'Certificato medico', 'Foto tessera', 'Ricevute di pagamento'],
  },
  {
    key: 'invalidita',
    title: 'Invalidità / accompagnamento',
    keywords: ['invalidit', 'accompagnamento', 'legge 104'],
    steps: [
      'Certificato medico introduttivo',
      'Presentare la domanda INPS',
      'Visita della commissione',
      'Ricevere il verbale',
      "Verificare l'esito",
    ],
    docs: ['Certificato medico', 'Documento identità', 'Codice fiscale', 'Documentazione sanitaria'],
  },
  {
    key: 'residenza',
    title: 'Cambio residenza',
    keywords: ['cambio residenza', 'cambio di residenza', 'trasferimento residenza'],
    steps: [
      'Compilare il modulo',
      'Presentare al Comune',
      'Attendere il controllo dei vigili',
      'Aggiornare patente e libretto',
    ],
    docs: ['Documento identità', 'Contratto di casa', 'Modulo di dichiarazione'],
  },
  { key: 'custom', title: '', keywords: [], steps: [], docs: [] },
];

export const findMaintenanceTemplate = (key: string | null | undefined) =>
  MAINTENANCE_TEMPLATES.find((t) => t.key === key);
export const findProcedureTemplate = (key: string | null | undefined) =>
  PROCEDURE_TEMPLATES.find((t) => t.key === key);
