import { describe, expect, it } from 'vitest';
import {
  ageOf,
  extractReadings,
  buildVisitSummary,
  careTodayRow,
  careTodos,
  doseSummary,
  dosesOfDay,
  estimateStock,
  formatPressure,
  formatReading,
  isoDayRome,
  lastVisitDate,
  latestReadings,
  threadValues,
  threadOverview,
  therapyChangeTitle,
  measuresFromReadings,
  parseCareNumber,
  normalizeText,
  parsePressure,
  romeToDate,
  scheduleLabel,
  sinceLastVisit,
  slotInstant,
  stockDaysLeft,
  stockLabel,
  stockLevel,
  suggestThread,
  weeklyAverages,
  type EntryLike,
} from '../src';

// Dati di esempio da `seed-cura.json`: papà ha due filoni (Tachicardia, Crohn) e quattro terapie.
const entry = (
  over: Partial<EntryLike> & Pick<EntryLike, 'id' | 'thread_id' | 'type' | 'entry_date' | 'title'>,
) => ({
  text: null,
  readings: {},
  ...over,
});
const ENTRIES = [
  entry({
    id: 'e1',
    thread_id: 'cardio',
    type: 'esame',
    entry_date: '2026-03-12',
    title: 'ECG',
    text: 'Ritmo sinusale, FC 94.',
  }),
  entry({
    id: 'e2',
    thread_id: 'cardio',
    type: 'terapia',
    entry_date: '2026-03-12',
    title: 'Bisoprololo da 1,25 a 2,5 mg',
  }),
  entry({
    id: 'e3',
    thread_id: 'cardio',
    type: 'episodio',
    entry_date: '2026-09-21',
    title: 'Palpitazioni dopo cena',
    text: 'Circa 20 minuti.',
    readings: { heart_rate: 112 },
  }),
  entry({
    id: 'e4',
    thread_id: 'cardio',
    type: 'visita',
    entry_date: '2026-10-07',
    title: 'Controllo cardiologico',
    text: 'Pressione nella norma. Ridurre il sale.',
    readings: { blood_pressure: '132/80' },
  }),
  entry({
    id: 'e5',
    thread_id: 'crohn',
    type: 'visita',
    entry_date: '2026-06-10',
    title: 'Controllo',
    text: 'Azatioprina confermata, controllo a 3-4 mesi.',
  }),
  entry({
    id: 'e6',
    thread_id: 'crohn',
    type: 'esame',
    entry_date: '2026-09-02',
    title: 'Esami del sangue e feci',
    readings: { calprotectin_ugg: 320, crp_mgdl: 0.9 },
  }),
  entry({
    id: 'e7',
    thread_id: 'crohn',
    type: 'episodio',
    entry_date: '2026-09-03',
    title: 'Crisi intestinale',
    text: '2 giorni.',
    readings: { stools_per_day: 5 },
  }),
];

const med = (over: Record<string, unknown>) => ({
  id: 'm',
  name: 'Farmaco',
  strength: null as string | null,
  dose_units: 1,
  unit: 'cpr',
  schedule: ['08:00'],
  active: true,
  stock_units: 28,
  stock_as_of: romeToDate(2026, 10, 8, 0, 0).toISOString(),
  package_units: 28 as number | null,
  thread_id: null as string | null,
  prescriber: null as string | null,
  refill_by: null as string | null,
  plan_expires_at: null as string | null,
  notes: null as string | null,
  ...over,
});

describe('scorte', () => {
  const mesalazina = med({
    id: 'mesa',
    name: 'Mesalazina',
    dose_units: 2,
    schedule: ['08:00', '20:00'],
    stock_units: 24,
  });

  it('senza dosi segnate si stima dalla posologia', () => {
    // da mezzanotte dell'8 ottobre alle 10 del 9: tre dosi previste (8 ott 8:00 e 20:00, 9 ott 8:00) da 2 compresse
    expect(estimateStock(mesalazina, [], romeToDate(2026, 10, 9, 10, 0))).toBe(18);
  });

  it("una dose segnata non si scala due volte (il database l'ha già tolta dalla scorta)", () => {
    const taken = [{ day: '2026-10-08', slot: '08:00' }];
    expect(estimateStock(mesalazina, taken, romeToDate(2026, 10, 9, 10, 0))).toBe(20);
  });

  it('giorni rimasti e livello', () => {
    const now = romeToDate(2026, 10, 8, 7, 0);
    expect(stockDaysLeft(mesalazina, [], now)).toBe(6);
    expect(stockLevel(6)).toBe('low');
    expect(stockLabel(6)).toBe('finisce tra 6 giorni');
    expect(stockLabel(1)).toBe('finisce domani');
    expect(stockLabel(0)).toBe('finita');
    expect(stockLevel(7)).toBe('ok');
    expect(stockLevel(0)).toBe('empty');
  });

  it('la scorta non va sotto zero e senza orari non si stima', () => {
    expect(estimateStock(mesalazina, [], romeToDate(2026, 12, 25, 10, 0))).toBe(0);
    const alBisogno = med({ schedule: [] });
    expect(stockDaysLeft(alBisogno, [], romeToDate(2026, 10, 20))).toBeNull();
    expect(estimateStock(alBisogno, [], romeToDate(2026, 10, 20))).toBe(28);
  });

  it("gli orari sono quelli di Roma anche nel giorno del cambio d'ora", () => {
    expect(slotInstant('2026-10-25', '08:00').toISOString()).toBe('2026-10-25T07:00:00.000Z');
    expect(slotInstant('2026-10-24', '08:00').toISOString()).toBe('2026-10-24T06:00:00.000Z');
  });
});

describe('dosi del giorno', () => {
  const meds = [
    med({ id: 'biso', name: 'Bisoprololo', schedule: ['08:00'] }),
    med({ id: 'mesa', name: 'Mesalazina', dose_units: 2, schedule: ['08:00', '20:00'] }),
    med({ id: 'aza', name: 'Azatioprina', schedule: ['13:00'] }),
    med({ id: 'ferma', name: 'Sospesa', schedule: ['09:00'], active: false }),
  ];
  const day = romeToDate(2026, 10, 28, 12, 0);

  it('ordina per orario e salta le terapie sospese', () => {
    const items = dosesOfDay(meds, [], day);
    expect(items.map((i) => `${i.slot} ${i.med.name}`)).toEqual([
      '08:00 Bisoprololo',
      '08:00 Mesalazina',
      '13:00 Azatioprina',
      '20:00 Mesalazina',
    ]);
  });

  it('la prossima dose è la prima non presa da adesso in poi', () => {
    const taken = [
      { medication_id: 'biso', day: '2026-10-28', slot: '08:00' },
      { medication_id: 'mesa', day: '2026-10-28', slot: '08:00' },
    ];
    const s = doseSummary(dosesOfDay(meds, taken, day), day);
    expect(s).toMatchObject({ taken: 2, total: 4 });
    expect(s.next?.med.name).toBe('Azatioprina');
  });

  it('una dose di ieri non conta per oggi; se resta indietro è la prossima', () => {
    const taken = [{ medication_id: 'biso', day: '2026-10-27', slot: '08:00' }];
    const late = romeToDate(2026, 10, 28, 22, 0);
    expect(doseSummary(dosesOfDay(meds, taken, late), late).next?.med.name).toBe('Bisoprololo');
  });

  it('etichette degli orari', () => {
    expect(scheduleLabel(['08:00'])).toBe('ore 8:00');
    expect(scheduleLabel(['08:00', '20:00'])).toBe('ore 8:00 e 20:00');
    expect(scheduleLabel(['07:30', '13:00', '20:00'])).toBe('ore 7:30, 13:00 e 20:00');
    expect(scheduleLabel([])).toBe('al bisogno');
  });
});

describe('riga di cura in Oggi (4g)', () => {
  const recipient = { label: 'Papà', first_name: 'Giorgio', caregiver_ids: ['luca', 'francesca'] };
  const meds = [
    med({ id: 'biso', name: 'Bisoprololo', schedule: ['08:00'] }),
    med({ id: 'aza', name: 'Azatioprina', schedule: ['13:00'] }),
  ];
  const now = romeToDate(2026, 10, 28, 9, 0);
  const base = { recipient, meds, taken: [], trackedParamLabels: [], measuredToday: false, now };

  it('mostra terapie fatte e prossima dose, solo ai caregiver', () => {
    const taken = [{ medication_id: 'biso', day: '2026-10-28', slot: '08:00' }];
    expect(careTodayRow({ ...base, taken, userId: 'luca' })).toEqual({
      title: 'Papà · terapie 1 di 2',
      sub: 'Prossima: azatioprina alle 13:00',
    });
    expect(careTodayRow({ ...base, userId: 'chiara' })).toBeNull();
  });

  it('sparisce quando non resta nulla da fare', () => {
    const taken = [
      { medication_id: 'biso', day: '2026-10-28', slot: '08:00' },
      { medication_id: 'aza', day: '2026-10-28', slot: '13:00' },
    ];
    expect(careTodayRow({ ...base, taken, userId: 'luca' })).toBeNull();
  });

  it('senza terapie propone i parametri da registrare, una volta sola al giorno', () => {
    const params = { ...base, meds: [], trackedParamLabels: ['Pressione', 'Freq. cardiaca'], userId: 'luca' };
    expect(careTodayRow(params)).toEqual({
      title: 'Papà · parametri da registrare',
      sub: 'Pressione, Freq. cardiaca',
    });
    expect(careTodayRow({ ...params, measuredToday: true })).toBeNull();
  });
});

describe("da quando l'ha visto (4f)", () => {
  it("la data è quella dell'ultima visita del filone", () => {
    expect(lastVisitDate(ENTRIES, 'crohn')).toBe('2026-06-10');
    expect(lastVisitDate(ENTRIES, 'cardio')).toBe('2026-10-07');
    expect(lastVisitDate([], 'crohn')).toBeNull();
  });

  it('include i tasselli del filone e quelli degli altri filoni nello stesso periodo', () => {
    const { since, items } = sinceLastVisit(ENTRIES, 'crohn');
    expect(since).toBe('2026-06-10');
    expect(items.map((i) => [i.entry.id, i.otherThread])).toEqual([
      ['e4', true], // visita cardiologica 7 ott, altro filone
      ['e3', true], // palpitazioni 21 set, altro filone
      ['e7', false],
      ['e6', false],
    ]);
  });

  it("i tasselli prima dell'ultima visita restano fuori, anche degli altri filoni", () => {
    const ids = sinceLastVisit(ENTRIES, 'crohn').items.map((i) => i.entry.id);
    expect(ids).not.toContain('e1');
    expect(ids).not.toContain('e2');
    expect(ids).not.toContain('e5');
  });

  it('senza visite precedenti elenca tutto', () => {
    expect(
      sinceLastVisit(
        ENTRIES.filter((e) => e.type !== 'visita'),
        'crohn',
      ).items,
    ).toHaveLength(5);
  });
});

describe('riepilogo per il medico (4i)', () => {
  const threads = [
    {
      id: 'cardio',
      title: 'Tachicardia',
      specialty: 'Cardiologia',
      doctor: 'Dott. Paolo Rossi',
      color_hue: 20,
      status: 'attivo',
    },
    {
      id: 'crohn',
      title: 'Morbo di Crohn',
      specialty: 'Gastroenterologia',
      doctor: 'Dott.ssa Marta Leoni',
      color_hue: 195,
      status: 'attivo',
    },
  ];
  const medications = [
    med({
      id: 'biso',
      name: 'Bisoprololo',
      strength: '2,5 mg',
      schedule: ['08:00'],
      thread_id: 'cardio',
      prescriber: 'Dott. Rossi',
    }),
    med({
      id: 'mesa',
      name: 'Mesalazina',
      strength: '800 mg',
      dose_units: 2,
      schedule: ['08:00', '20:00'],
      thread_id: 'crohn',
      prescriber: 'Dott.ssa Leoni',
    }),
    med({
      id: 'panto',
      name: 'Pantoprazolo',
      strength: '20 mg',
      schedule: ['07:30'],
      notes: 'a digiuno',
      prescriber: 'Dott.ssa Neri (MMG)',
    }),
  ];
  const summary = buildVisitSummary({
    recipient: {
      first_name: 'Giorgio',
      last_name: 'Moretti',
      birth_date: '1945-02-14',
      tax_code: null,
      allergies: ['Penicillina'],
      exemptions: [{ code: '009', label: 'Morbo di Crohn' }],
    },
    thread: threads[1],
    threads,
    entries: ENTRIES,
    medications,
    visit: {
      starts_at: romeToDate(2026, 10, 28, 11, 0).toISOString(),
      caregiverName: 'Francesca Moretti',
      caregiverPhone: '347 000 0000',
    },
    questions: ["L'azatioprina va bene insieme al bisoprololo?"],
    now: romeToDate(2026, 10, 9, 10, 0),
  });

  it('anagrafica, età e avvertenze', () => {
    expect(summary.patientName).toBe('Giorgio Moretti');
    expect(summary.birthLine).toContain('81 anni');
    expect(summary.allergies).toEqual(['Penicillina']);
    expect(summary.exemptions).toEqual(['Esenzione 009 (Morbo di Crohn)']);
    expect(summary.caregiverLine).toBe('Accompagna: Francesca Moretti · 347 000 0000');
  });

  it('le terapie sono quelle di tutti i filoni, con la posologia', () => {
    expect(summary.medications.map((m) => m.name)).toEqual([
      'Bisoprololo 2,5 mg',
      'Mesalazina 800 mg',
      'Pantoprazolo 20 mg',
    ]);
    expect(summary.medications[1]).toMatchObject({
      posology: '2 cpr ore 8:00 e 20:00',
      threadTitle: 'Morbo di Crohn',
    });
    expect(summary.medications[2]).toMatchObject({ posology: '1 cpr a digiuno', threadTitle: null });
  });

  it("il filone principale parte dall'ultima visita; gli altri sono sintetizzati a parte", () => {
    expect(summary.main.since).toBe('2026-06-10');
    expect(summary.main.rows.map((r) => r.date)).toEqual(['03/09', '02/09', '10/06']);
    expect(summary.main.rows[0].text).toContain('Crisi intestinale');
    expect(summary.main.rows[1].text).toBe(
      'Esami del sangue e feci: Calprotectina fecale 320 µg/g · PCR 0,9 mg/dl',
    );
    expect(summary.others.map((o) => o.title)).toEqual(['Tachicardia']);
    expect(summary.others[0].rows.map((r) => r.date)).toEqual(['07/10', '21/09']);
  });

  it('porta le domande e la nota che non sostituisce la documentazione clinica', () => {
    expect(summary.questions).toHaveLength(1);
    expect(summary.note).toMatch(/non sostituisce la documentazione clinica/i);
  });

  it('età: il compleanno non ancora arrivato non conta', () => {
    expect(ageOf('1945-02-14', romeToDate(2026, 2, 13))).toBe(80);
    expect(ageOf('1945-02-14', romeToDate(2026, 2, 14))).toBe(81);
  });
});

describe('da fare', () => {
  const mesa = med({
    id: 'mesa',
    name: 'Mesalazina',
    dose_units: 2,
    schedule: ['08:00', '20:00'],
    stock_units: 24,
    refill_by: 'Dott.ssa Neri (MMG)',
  });
  const aza = med({ id: 'aza', name: 'Azatioprina', plan_expires_at: '2026-11-30' });
  const input = {
    medications: [mesa, aza],
    doses: [],
    exemptions: [{ code: '009', label: 'Morbo di Crohn', expires_at: null }],
    followUps: [
      { title: 'Holter 24 h', due_date: '2026-12-31' },
      { title: 'Controllo Dott. Rossi', due_hint: '6 mesi', event_id: 'ev' },
    ],
    refillRequested: new Set<string>(),
    now: romeToDate(2026, 10, 8, 7, 0),
  };

  it('ricetta da chiedere quando la scorta scende sotto 7 giorni', () => {
    const todos = careTodos(input);
    expect(todos[0]).toMatchObject({ kind: 'ricetta', title: 'Ricetta mesalazina', daysLeft: 6 });
    expect(todos[0].detail).toBe('finisce tra 6 gg · Dott.ssa Neri (MMG)');
  });

  it('il prossimo passo senza impegno resta; con un impegno creato sparisce', () => {
    const steps = careTodos(input).filter((t) => t.kind === 'prossimo-passo');
    expect(steps.map((t) => t.title)).toEqual(['Holter 24 h']);
  });

  it('il piano terapeutico compare nei 30 giorni prima della scadenza', () => {
    expect(careTodos(input).some((t) => t.kind === 'piano')).toBe(false);
    const near = careTodos({ ...input, now: romeToDate(2026, 11, 5) });
    expect(near.find((t) => t.kind === 'piano')).toMatchObject({
      title: 'Piano terapeutico azatioprina',
      daysLeft: 25,
    });
  });

  it('una ricetta già richiesta non si ripropone', () => {
    const todos = careTodos({ ...input, refillRequested: new Set(['mesa']) });
    expect(todos.some((t) => t.kind === 'ricetta')).toBe(false);
  });

  it('le esenzioni permanenti non generano avvisi, quelle in scadenza sì', () => {
    expect(careTodos(input).some((t) => t.kind === 'esenzione')).toBe(false);
    const todos = careTodos({ ...input, exemptions: [{ label: 'Invalidità', expires_at: '2026-10-20' }] });
    expect(todos.find((t) => t.kind === 'esenzione')?.daysLeft).toBe(12);
  });

  it('ordina dal più urgente', () => {
    const days = careTodos({ ...input, now: romeToDate(2026, 11, 5) }).map((t) => t.daysLeft);
    expect(days).toEqual([...days].sort((a, b) => (a ?? 1e9) - (b ?? 1e9)));
  });
});

describe('parametri', () => {
  it('pressione: lettura e formato', () => {
    expect(parsePressure('132/80')).toEqual([132, 80]);
    expect(parsePressure(' 120 - 70 ')).toEqual([120, 70]);
    expect(parsePressure('abc')).toBeNull();
    expect(formatPressure(132, 80)).toBe('132/80');
    expect(formatReading('blood_pressure', '132/80')).toBe('132/80 mmHg');
    expect(formatReading('weight', 70.5)).toBe('70,5 kg');
    expect(formatReading('calprotectin_ugg', 320)).toBe('320 µg/g');
  });

  it('medie settimanali su 8 settimane, con le settimane degli episodi segnalate', () => {
    const hr = [
      ['2026-08-10', 72],
      ['2026-08-17', 70],
      ['2026-08-31', 74],
      ['2026-09-07', 69],
      ['2026-09-21', 88],
      ['2026-09-28', 71],
      ['2026-10-05', 67],
      ['2026-10-08', 68],
    ] as const;
    const measures = hr.map(([day, value]) => ({
      type: 'heart_rate',
      value,
      measured_at: romeToDate(+day.slice(0, 4), +day.slice(5, 7), +day.slice(8), 9).toISOString(),
    }));
    const weeks = weeklyAverages(measures, ['2026-09-21'], 'heart_rate', romeToDate(2026, 10, 8, 12), 8);
    expect(weeks).toHaveLength(8);
    expect(isoDayRome(weeks[7].start)).toBe('2026-10-05'); // lunedì della settimana corrente
    expect(weeks[7]).toMatchObject({ average: 67.5, count: 2, episode: false });
    expect(weeks[5]).toMatchObject({ average: 88, episode: true }); // settimana del 21 settembre
    expect(weeks[4].average).toBeNull(); // 14 settembre: nessuna misura
    expect(weeks.filter((w) => w.episode)).toHaveLength(1);
  });
});

describe('filone proposto alla chiusura di una visita', () => {
  const threads = [
    {
      id: 'cardio',
      title: 'Tachicardia',
      specialty: 'Cardiologia',
      doctor: 'Dott. Paolo Rossi',
      contact_id: 'c-rossi',
    },
    {
      id: 'crohn',
      title: 'Morbo di Crohn',
      specialty: 'Gastroenterologia',
      doctor: 'Dott.ssa Marta Leoni',
      contact_id: null,
    },
  ];
  const pick = (
    visit: { care_thread_id?: string | null; contact_id?: string | null; title: string },
    contact: string | null = null,
  ) => suggestThread(threads, visit, contact, normalizeText)?.id ?? null;

  it('prima il filone già collegato, poi lo stesso medico, poi la specialità', () => {
    expect(pick({ title: 'Visita', care_thread_id: 'crohn' })).toBe('crohn');
    expect(pick({ title: 'Visita', contact_id: 'c-rossi' })).toBe('cardio');
    expect(pick({ title: 'Controllo', contact_id: 'x' }, 'Marta Leoni')).toBe('crohn');
    expect(pick({ title: 'Gastroenterologa papà' })).toBe('crohn');
  });

  it("se non si capisce, non sceglie al posto dell'utente (a meno che il filone sia uno solo)", () => {
    expect(pick({ title: 'Visita papà' })).toBeNull();
    expect(suggestThread([threads[0]], { title: 'Visita papà' }, null, normalizeText)?.id).toBe('cardio');
  });
});

describe('valori dei tasselli', () => {
  it('diventano misure per i grafici solo se sono parametri monitorabili', () => {
    expect(
      measuresFromReadings({ heart_rate: 112, blood_pressure: '132/80', calprotectin_ugg: 320 }),
    ).toEqual([
      { type: 'heart_rate', value: 112, value2: null },
      { type: 'blood_pressure', value: 132, value2: 80 },
    ]);
    expect(measuresFromReadings({ blood_pressure: 'boh', weight: '70,5' })).toEqual([
      { type: 'weight', value: 70.5, value2: null },
    ]);
  });

  it("numeri scritti all'italiana", () => {
    expect(parseCareNumber('70,5')).toBe(70.5);
    expect(parseCareNumber(' 12 ')).toBe(12);
    expect(parseCareNumber('')).toBeNull();
    expect(parseCareNumber('abc')).toBeNull();
  });
});

describe('scheda del filone', () => {
  const entries = ENTRIES.map((e) => ({
    ...e,
    follow_ups: [] as {
      title: string;
      due_date?: string | null;
      due_hint?: string | null;
      event_id?: string | null;
    }[],
  }));
  entries[3].follow_ups = [
    { title: 'Holter 24 h', due_date: '2026-12-31' },
    { title: 'Controllo', due_hint: '6 mesi', event_id: 'ev' },
  ];
  const now = romeToDate(2026, 10, 9, 10);

  it("conta i tasselli e indica l'ultimo", () => {
    expect(threadOverview(entries, [], 'cardio', now)).toMatchObject({
      count: 4,
      last: { date: '2026-10-07', type: 'visita' },
    });
    expect(threadOverview(entries, [], 'crohn', now)).toMatchObject({
      count: 3,
      last: { date: '2026-09-03', type: 'episodio' },
    });
  });

  it("il prossimo è l'impegno più vicino; senza impegni, il prossimo passo da fissare", () => {
    const events = [
      {
        id: 'a',
        care_thread_id: 'crohn',
        starts_at: romeToDate(2026, 12, 1, 9).toISOString(),
        status: 'open' as const,
        title: 'Esami',
      },
      {
        id: 'b',
        care_thread_id: 'crohn',
        starts_at: romeToDate(2026, 10, 28, 11).toISOString(),
        status: 'open' as const,
        title: 'Visita',
      },
      {
        id: 'c',
        care_thread_id: 'crohn',
        starts_at: romeToDate(2026, 10, 1, 11).toISOString(),
        status: 'open' as const,
        title: 'Passata',
      },
    ];
    expect(threadOverview(entries, events, 'crohn', now).next).toEqual({
      kind: 'impegno',
      date: '2026-10-28',
      title: 'Visita',
    });
    expect(threadOverview(entries, [], 'cardio', now).next).toEqual({
      kind: 'passo',
      title: 'Holter 24 h',
      hint: '2026-12-31',
    });
    expect(threadOverview(entries, [], 'crohn', now).next).toBeNull();
  });

  it("valori chiave: l'ultima misura di ogni parametro", () => {
    expect(
      latestReadings(
        ENTRIES.filter((e) => e.thread_id === 'cardio'),
        ['heart_rate', 'blood_pressure', 'weight'],
      ),
    ).toEqual([
      { key: 'heart_rate', value: 112 },
      { key: 'blood_pressure', value: '132/80' },
    ]);
  });

  it('valori chiave: le misure rapide contano e vince il valore più recente', () => {
    const entries = [{ entry_date: '2026-10-01', readings: { stools_per_day: 6 } }];
    const measures = [
      { type: 'stools_per_day', value: 1, value2: null, measured_at: '2026-10-09T08:00:00Z' },
      { type: 'blood_pressure', value: 130, value2: 80, measured_at: '2026-10-08T08:00:00Z' },
    ];
    expect(threadValues(entries, measures, [])).toEqual([
      { key: 'stools_per_day', value: 1 },
      { key: 'blood_pressure', value: '130/80' },
    ]);
    // un tassello più recente della misura prevale
    expect(
      threadValues([{ entry_date: '2026-10-10', readings: { stools_per_day: 4 } }], measures, []),
    ).toContainEqual({ key: 'stools_per_day', value: 4 });
    expect(threadValues([], [], ['weight'])).toEqual([]);
  });

  it('titolo di una terapia modificata: dosaggio o numero di compresse', () => {
    const base = { name: 'Bisoprololo', from: { strength: '1,25 mg', doseUnits: 1, unit: 'cpr' } };
    expect(therapyChangeTitle({ ...base, to: { strength: '2,5 mg', doseUnits: 1, unit: 'cpr' } })).toBe(
      'Bisoprololo da 1,25 mg a 2,5 mg',
    );
    expect(therapyChangeTitle({ ...base, to: { strength: '1,25 mg', doseUnits: 2, unit: 'cpr' } })).toBe(
      'Bisoprololo da 1 cpr a 2 cpr',
    );
    expect(
      therapyChangeTitle({
        name: 'Tachipirina',
        from: { strength: null, doseUnits: 1, unit: 'cpr' },
        to: { strength: null, doseUnits: 1.5, unit: 'cpr' },
      }),
    ).toBe('Tachipirina da 1 cpr a 1,5 cpr');
  });
});

describe('valori letti da un referto', () => {
  it('trova esami e parametri noti, con la virgola decimale', () => {
    const text = `REFERTO ESAMI\nCalprotectina fecale: 180 µg/g (v.n. < 50)\nPCR 0.6 mg/dl\nPressione arteriosa 132 / 80 mmHg\nFC 94 bpm\nPeso 70.5 kg`;
    expect(extractReadings(text)).toEqual({
      calprotectin_ugg: '180',
      crp_mgdl: '0,6',
      blood_pressure: '132/80',
      heart_rate: '94',
      weight: '70,5',
    });
  });

  it("ignora ciò che non riconosce e i numeri lontani dall'etichetta", () => {
    expect(extractReadings('Esame del sangue. Emoglobina 13,2 g/dl. Paziente 82 anni.')).toEqual({});
    expect(extractReadings('Il peso del referto è lieve\nnote 12 kg')).toEqual({});
  });
});
