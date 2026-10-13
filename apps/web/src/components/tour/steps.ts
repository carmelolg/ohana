/** Pannelli dell'app che un passo può aprire per mostrarne il contenuto. */
export type TourOverlay = 'new';

export interface TourStep {
  id: string;
  title: string;
  text: string;
  /** Pagina da mostrare mentre il passo è attivo. */
  route: string;
  /** Selettori dell'elemento reale da evidenziare; vince il primo visibile (barra inferiore su mobile, laterale su desktop). Senza: passo centrato. */
  targets?: string[];
  /** Esempio da provare, mostrato sotto il testo. */
  example?: string;
  /** Pannello da aprire per questo passo (chiuso quando si passa oltre). */
  overlay?: TourOverlay;
  /** Toccando davvero l'elemento evidenziato si passa al passo successivo. */
  clickAdvances?: boolean;
}

const nav = (path: string) => [`.tabbar a[href="${path}"]`, `.sidebar a[href="${path}"]`];

/** I passi della guida: ognuno punta a un elemento vero dell'app, così si impara dove trovarlo. */
export const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'benvenuto',
    title: 'Benvenuto in Ohana',
    text: 'Impegni, spesa, scadenze e spese della famiglia, in un posto solo e condiviso con chi vive con te. Ti accompagno tra le schermate in un minuto.',
    route: '/oggi',
  },
  {
    id: 'oggi',
    title: 'Oggi: cosa c’è da fare',
    text: 'La schermata di partenza raccoglie ciò che ti riguarda adesso: il prossimo impegno, le scadenze e le faccende.',
    route: '/oggi',
    targets: ['.page-head'],
  },
  {
    id: 'lista',
    title: 'Spunta e rimanda',
    text: 'Tocca il cerchio per segnare un impegno come fatto; da una riga puoi anche rimandarlo o aprirlo per modificarlo.',
    route: '/oggi',
    targets: ['.main .list'],
  },
  {
    id: 'spazio',
    title: 'Gli spazi',
    text: 'Uno spazio è un gruppo di persone: famiglia, coppia, coinquilini. Da qui passi dall’uno all’altro, o a «Tutti», e inviti chi vuoi.',
    route: '/oggi',
    targets: ['.navbar .space-title'],
  },
  {
    id: 'plus',
    title: 'Il pulsante «+»',
    text: 'Tutto nasce da qui. Toccalo davvero: ti faccio vedere cosa succede.',
    route: '/oggi',
    targets: ['.tabbar .tab-plus', '.navbar .btn.accent'],
    clickAdvances: true,
  },
  {
    id: 'scrivi',
    title: 'Scrivi come parli',
    text: 'Scrivi (o detta) una frase: Ohana capisce se è un impegno, una nota, una spesa o una ripetizione. Puoi provare adesso, senza salvare nulla.',
    example: 'plastica ogni giovedì',
    route: '/oggi',
    targets: ['.sheet .prompt-bar'],
    overlay: 'new',
  },
  {
    id: 'cerca',
    title: 'Cerca ovunque',
    text: 'Impegni, contatti e documenti si trovano da qui. Su computer basta premere «/».',
    route: '/oggi',
    targets: ['.navbar .search-field', '.navbar .navbar-search-mobile'],
  },
  {
    id: 'bacheca',
    title: 'La campanella',
    text: 'Le note lasciate dagli altri membri compaiono qui, con il numero di quelle nuove.',
    route: '/oggi',
    targets: ['.navbar .bell'],
  },
  {
    id: 'agenda',
    title: 'Agenda',
    text: 'Il calendario condiviso, in vista giorno, settimana o mese, con ricorrenze e promemoria. Tocca «Agenda» per entrare.',
    route: '/oggi',
    targets: nav('/calendario'),
    clickAdvances: true,
  },
  {
    id: 'viste',
    title: 'Scegli la vista',
    text: 'Cambia tra giorno, settimana e mese e scorri con le frecce. Dalle impostazioni puoi collegare l’agenda al calendario del telefono.',
    route: '/calendario',
    targets: ['.main .seg'],
  },
  {
    id: 'casa',
    title: 'Casa',
    text: 'La parte pratica: lista della spesa, spese da dividere, scadenze, manutenzioni, documenti e pratiche. Tocca «Casa».',
    route: '/calendario',
    targets: nav('/casa'),
    clickAdvances: true,
  },
  {
    id: 'casa-aree',
    title: 'Le aree di Casa',
    text: 'Ogni scheda apre una funzione. Vedi solo quelle accese nel tuo spazio: chi gestisce lo spazio può accendere o spegnere le altre.',
    route: '/casa',
    targets: ['.main .more-grid'],
  },
  {
    id: 'famiglia',
    title: 'Famiglia',
    text: 'Rubrica, scheda di emergenza, bacheca e cura delle persone che assisti. Tocca «Famiglia».',
    route: '/casa',
    targets: nav('/famiglia'),
    clickAdvances: true,
  },
  {
    id: 'famiglia-aree',
    title: 'Le persone e le emergenze',
    text: 'Qui trovi i contatti importanti e i dati da avere a portata di mano in caso di bisogno, anche senza connessione.',
    route: '/famiglia',
    targets: ['.main .more-grid', '.main .more-list'],
  },
  {
    id: 'profilo',
    title: 'Il tuo profilo',
    text: 'Dall’avatar scegli notifiche, aspetto ed esci dall’account. In «Il mio profilo» puoi rivedere questa guida quando vuoi.',
    route: '/famiglia',
    targets: ['.navbar .avatar-btn'],
  },
];
