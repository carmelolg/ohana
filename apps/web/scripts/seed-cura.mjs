// Dati di esempio per la sezione Cura (`supabase/seed-cura.json`): sviluppo locale, mai su un progetto vero.
// Uso: SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-cura.mjs <la-tua-email>
// Crea (o aggiorna) lo spazio «Mamma e papà» con la tua email come proprietario e caregiver «Luca» (l'utente si crea se non
// esiste: poi accedi con il link che trovi in Mailpit, http://127.0.0.1:54324); gli altri
// caregiver («francesca», «chiara») sono utenti finti @ohana.test. È ripetibile: gli id derivano dai nomi del file.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ownerEmail = process.argv[2];
if (!key || !ownerEmail) {
  console.error('Uso: SUPABASE_SERVICE_ROLE_KEY=… node scripts/seed-cura.mjs <email>');
  process.exit(1);
}
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error('Questo seed è solo per lo sviluppo locale: SUPABASE_URL deve essere 127.0.0.1 o localhost.');
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const seed = JSON.parse(readFileSync(new URL('../../../supabase/seed-cura.json', import.meta.url), 'utf8'));
const SPACE_NAME = 'Mamma e papà';
const NOW = new Date();

/** UUID stabile a partire da un nome del file di esempio («cr_papa» → sempre lo stesso id). */
function uuidFor(name) {
  const h = createHash('sha1').update(`ohana-cura:${name}`).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

function must({ error }, what) {
  if (error) {
    throw new Error(`${what}: ${error.message}`);
  }
}

async function userByEmail(email) {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 });
  return data?.users.find((u) => u.email === email);
}

async function ensureUser(email, firstName) {
  const existing = await userByEmail(email);
  if (existing) {
    return existing.id;
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { given_name: firstName },
  });
  if (error) {
    throw new Error(`utente ${email}: ${error.message}`);
  }
  return data.user.id;
}

async function ensureSpace(ownerId, memberIds) {
  const { data } = await db
    .from('spaces')
    .select('id')
    .eq('name', SPACE_NAME)
    .eq('created_by', ownerId)
    .maybeSingle();
  let spaceId = data?.id;
  if (!spaceId) {
    const created = await db
      .from('spaces')
      .insert({ name: SPACE_NAME, created_by: ownerId })
      .select('id')
      .single();
    must(created, 'spazio');
    spaceId = created.data.id;
  }
  const rows = memberIds.map((user_id) => ({ space_id: spaceId, user_id, role: 'member' }));
  must(
    await db.from('space_members').upsert(rows, { onConflict: 'space_id,user_id', ignoreDuplicates: true }),
    'membri',
  );
  return spaceId;
}

async function insertEvents(spaceId, people) {
  const visits = [
    {
      key: 'ev_cardio_0710',
      title: 'Controllo cardiologico',
      at: '2026-10-07T10:00:00+02:00',
      status: 'done',
    },
    {
      key: 'ev_gastro_2810',
      title: 'Gastroenterologa papà',
      at: '2026-10-28T11:00:00+02:00',
      status: 'open',
    },
  ];
  const { data: cats } = await db
    .from('categories')
    .select('id')
    .eq('space_id', spaceId)
    .eq('slug', 'visita')
    .single();
  const rows = visits.map((v) => ({
    id: uuidFor(v.key),
    space_id: spaceId,
    title: v.title,
    category_id: cats?.id,
    starts_at: new Date(v.at).toISOString(),
    status: v.status,
    assignee_id: people.luca,
    created_by: people.luca,
  }));
  must(await db.from('events').upsert(rows), 'impegni');
}

async function insertCare(spaceId, people) {
  const ids = (names) => names.map((n) => people[n]).filter(Boolean);
  const recipients = seed.care_recipients.map((r) => ({
    id: uuidFor(r.id),
    space_id: spaceId,
    first_name: r.first_name,
    last_name: r.last_name,
    label: r.label,
    birth_date: r.birth_date,
    allergies: r.allergies,
    exemptions: r.exemptions,
    caregiver_ids: ids(r.caregivers),
    created_by: people.luca,
  }));
  must(await db.from('care_recipients').upsert(recipients), 'persone assistite');
  const threads = seed.care_threads.map((t) => ({
    id: uuidFor(t.id),
    space_id: spaceId,
    recipient_id: uuidFor(t.recipient),
    title: t.title,
    specialty: t.specialty,
    doctor: t.doctor,
    color_hue: t.color_hue,
    started_at: t.started_at,
    status: t.status,
    tracked_params: t.tracked_params,
  }));
  must(await db.from('care_threads').upsert(threads), 'filoni');
  return { threads };
}

async function insertMedications(spaceId) {
  const rows = seed.medications.map((m) => ({
    id: uuidFor(m.id),
    space_id: spaceId,
    recipient_id: uuidFor(m.recipient),
    thread_id: m.thread ? uuidFor(m.thread) : null,
    name: m.name,
    strength: m.strength,
    dose_units: Number(m.dose.split(' ')[0]),
    unit: m.dose.split(' ').slice(1).join(' ') || 'cpr',
    schedule: m.schedule,
    notes: m.notes ?? null,
    stock_units: m.stock_units,
    stock_as_of: NOW.toISOString(),
    package_units: m.package_units,
    prescriber: m.prescriber,
    refill_by: m.refill_by ?? null,
    plan_expires_at: m.therapeutic_plan?.expires_at ?? null,
    plan_issuer: m.therapeutic_plan?.issuer ?? null,
  }));
  must(await db.from('medications').upsert(rows), 'terapie');
}

async function insertHistory(spaceId, people) {
  const threadOf = (key) => seed.care_threads.find((t) => t.id === key);
  const entries = seed.care_entries.map((e, i) => ({
    id: uuidFor(`entry:${i}`),
    space_id: spaceId,
    recipient_id: uuidFor(threadOf(e.thread).recipient),
    thread_id: uuidFor(e.thread),
    type: e.type,
    entry_date: e.date,
    title: e.title,
    text: e.text ?? null,
    readings: e.values ?? {},
    follow_ups: (e.follow_ups ?? []).map((f) => ({
      title: f.title,
      due_date: f.due_date ?? null,
      due_hint: f.due_hint ?? null,
    })),
    author_id: people[e.author ?? 'luca'] ?? people.luca,
    event_id: e.event_id ? uuidFor(e.event_id) : null,
    medication_id: e.medication_change ? uuidFor(e.medication_change.med) : null,
  }));
  must(await db.from('care_entries').upsert(entries), 'tasselli');
  const measures = seed.measurements.flatMap((m) =>
    m.values.map(([day, value], i) => ({
      id: uuidFor(`misura:${m.type}:${i}`),
      space_id: spaceId,
      recipient_id: uuidFor(m.recipient),
      type: m.type,
      value,
      measured_at: new Date(`${day}T09:00:00+02:00`).toISOString(),
      author_id: people.luca,
    })),
  );
  must(await db.from('measurements').upsert(measures), 'misure');
}

async function insertPrep(spaceId, people) {
  for (const p of seed.visit_prep) {
    const eventId = uuidFor(p.event_id);
    must(
      await db.from('visit_prep').upsert({
        id: eventId,
        space_id: spaceId,
        event_id: eventId,
        thread_id: uuidFor(p.thread),
        bring: p.bring.map((text) => ({ text, done: false })),
      }),
      'preparazione visita',
    );
    const questions = p.questions.map((q, i) => ({
      id: uuidFor(`domanda:${p.event_id}:${i}`),
      space_id: spaceId,
      prep_id: eventId,
      text: q.text,
      author_id: people[q.author] ?? people.luca,
      position: i + 1,
    }));
    must(await db.from('visit_questions').upsert(questions), 'domande');
    must(
      await db
        .from('events')
        .update({ care_thread_id: uuidFor(p.thread) })
        .eq('id', eventId),
      'filone dell’impegno',
    );
  }
}

async function main() {
  const people = {
    luca: await ensureUser(ownerEmail, 'Luca'),
    francesca: await ensureUser('francesca@ohana.test', 'Francesca'),
    chiara: await ensureUser('chiara@ohana.test', 'Chiara'),
  };
  people.mamma = people.chiara;
  const spaceId = await ensureSpace(people.luca, [people.francesca, people.chiara]);
  await insertEvents(spaceId, people);
  await insertCare(spaceId, people);
  await insertMedications(spaceId);
  await insertHistory(spaceId, people);
  // ev_cardio_0710 è un tassello della visita: l'impegno punta al suo filone dopo che i filoni esistono
  await insertPrep(spaceId, people);
  console.log(`Fatto: spazio «${SPACE_NAME}» pronto (${spaceId}).`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
