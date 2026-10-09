import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  CARE_PARAMS,
  formatCareNumber,
  formatPressure,
  isParamKey,
  weeklyAverages,
  type ParamKey,
  type WeekBucket,
} from '@ohana/shared';
import { BackLink } from '../../components/BackLink';
import { ParamChart } from '../../components/care/ParamChart';
import { RecordSheet } from '../../components/care/RecordSheet';
import { quickActions, type QuickAction } from '../../components/care/quickActions';
import { useCareEntries, useMeasurements, useSpace } from '../../lib/data';
import type { CareEntry, Measurement } from '../../lib/types';
import { useRecipientData } from './useRecipientData';

const WEEKS = 8;
const EPISODES_SHOWN = 5;
const DAY_MONTH = new Intl.DateTimeFormat('it-IT', {
  timeZone: 'Europe/Rome',
  day: '2-digit',
  month: '2-digit',
});

/** Il numero grande del grafico: l'ultima media settimanale (per la pressione, l'ultima misura intera). */
function headlineOf(param: ParamKey, weeks: WeekBucket[], measures: Measurement[]): string {
  const latest = measures.find((m) => m.type === param);
  if (param === 'blood_pressure' && latest) {
    return formatPressure(latest.value, latest.value2);
  }
  const week = [...weeks].reverse().find((w) => w.average !== null);
  return week ? formatCareNumber(week.average!, CARE_PARAMS[param].decimals) : '—';
}

function EpisodeRow({ entry, author }: { entry: CareEntry; author: string }) {
  const values = Object.entries(entry.readings)
    .filter(([k]) => isParamKey(k))
    .map(([k, v]) => `${CARE_PARAMS[k as ParamKey].chip} ${String(v)}`);
  return (
    <div className="episode-row">
      <span className="tl-date">{DAY_MONTH.format(new Date(entry.entry_date + 'T09:00:00'))}</span>
      <div>
        <b>{entry.title}</b>
        <div className="muted" style={{ fontSize: 13 }}>
          {[entry.text, ...values, author].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  );
}

/** Parametri ed episodi (4e): grafico delle medie settimanali e registrazione in un tap. */
export function CareParamsPage() {
  const { rid } = useParams();
  const data = useRecipientData(rid);
  const { memberName } = useSpace();
  const { data: measures = [] } = useMeasurements(rid);
  const { data: entries = [] } = useCareEntries(rid);
  const [param, setParam] = useState<ParamKey | null>(null);
  const [recording, setRecording] = useState<QuickAction | null>(null);
  const actions = useMemo(() => quickActions(data.threads), [data.threads]);
  const params = actions.flatMap((a) => (a.kind === 'measure' ? [a.param] : []));
  const current: ParamKey = param ?? params[0] ?? 'heart_rate';
  const episodes = entries.filter((e) => e.type === 'episodio');
  const weeks = useMemo(
    () =>
      weeklyAverages(
        measures,
        episodes.map((e) => e.entry_date),
        current,
        new Date(),
        WEEKS,
      ),
    // gli episodi derivano da `entries`
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [measures, entries, current],
  );
  if (!data.recipient) {
    return data.loading ? (
      <div className="empty">Caricamento…</div>
    ) : (
      <div className="empty">Persona non trovata</div>
    );
  }
  const info = CARE_PARAMS[current];

  return (
    <div>
      <BackLink to={`/cura/${data.recipient.id}`} label={data.recipient.label ?? data.recipient.first_name} />
      <h1 className="care-name">Parametri</h1>
      <div className="chips" role="group" aria-label="Parametro" style={{ marginTop: 8 }}>
        {params.map((p) => (
          <button key={p} className="chip" aria-pressed={current === p} onClick={() => setParam(p)}>
            {CARE_PARAMS[p].chip}
          </button>
        ))}
      </div>
      <div className="chart">
        <span className="label">Media settimanale · {WEEKS} settimane</span>
        <div className="headline">
          {headlineOf(current, weeks, measures)} <small>{info.unit}</small>
        </div>
        <ParamChart weeks={weeks} decimals={info.decimals} />
        {weeks.some((w) => w.episode) && (
          <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>
            In rosso le settimane con un episodio.
          </p>
        )}
      </div>
      {data.canWrite && (
        <>
          <div className="care-section-head">
            <span className="label">Registra ora</span>
          </div>
          <div className="quick-grid">
            {actions.map((a) => (
              <button key={a.id} type="button" onClick={() => setRecording(a)}>
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="care-section-head">
        <span className="label">Ultimi episodi</span>
      </div>
      {episodes.slice(0, EPISODES_SHOWN).map((e) => (
        <EpisodeRow key={e.id} entry={e} author={memberName(e.author_id).split(' ')[0]} />
      ))}
      {episodes.length === 0 && <p className="muted">Nessun episodio registrato.</p>}
      {recording && (
        <RecordSheet
          recipient={data.recipient}
          threads={data.threads}
          action={recording}
          onClose={() => setRecording(null)}
        />
      )}
    </div>
  );
}
