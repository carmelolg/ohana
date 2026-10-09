import type { VisitSummary } from '@ohana/shared';
import { careColor } from '../../lib/color';

const Dot = ({ hue }: { hue: number }) => (
  <span
    className="dot"
    style={{
      background: careColor(hue),
      display: 'inline-block',
      width: '7pt',
      height: '7pt',
      borderRadius: '50%',
    }}
  />
);

function Header({ summary }: { summary: VisitSummary }) {
  return (
    <>
      <div className="mono">Ohana · Riepilogo per la visita</div>
      <h1>{summary.patientName}</h1>
      <div className="grid2">
        {summary.birthLine && <span>{summary.birthLine}</span>}
        <span>{summary.visitLine}</span>
        {summary.exemptions.map((e) => (
          <span key={e}>{e}</span>
        ))}
        {summary.caregiverLine && <span>{summary.caregiverLine}</span>}
        {summary.taxCode && <span>Codice fiscale {summary.taxCode}</span>}
      </div>
      <div className="block">
        <h2>Allergie e avvertenze</h2>
        <p style={{ margin: '4pt 0 0' }}>
          {summary.allergies.length ? `${summary.allergies.join(', ')}.` : 'Nessuna segnalata.'}
        </p>
      </div>
    </>
  );
}

function Medications({ items }: { items: VisitSummary['medications'] }) {
  return (
    <div className="block">
      <h2>Terapie in corso (tutti i filoni)</h2>
      <table>
        <thead>
          <tr>
            <th style={{ width: '40%' }}>Farmaco</th>
            <th>Posologia</th>
            <th>Filone · prescrittore</th>
          </tr>
        </thead>
        <tbody>
          {items.map((m) => (
            <tr key={m.name}>
              <td>{m.name}</td>
              <td>{m.posology}</td>
              <td>
                {m.hue !== null && <Dot hue={m.hue} />}
                {[m.threadTitle ?? 'Medico di base', m.prescriber].filter(Boolean).join(' · ')}
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={3}>Nessuna terapia registrata.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function MainThread({ main }: { main: VisitSummary['main'] }) {
  const since = main.since ? ` · dall'ultima visita (${main.since.slice(8)}/${main.since.slice(5, 7)})` : '';
  return (
    <div className="block">
      <h2>
        <Dot hue={main.hue} />
        {main.title}
        {since}
      </h2>
      <table>
        <tbody>
          {main.rows.map((r, i) => (
            <tr key={i}>
              <td style={{ width: '22%' }} className="mono">
                {r.date}
              </td>
              <td>{r.text}</td>
            </tr>
          ))}
          {main.rows.length === 0 && (
            <tr>
              <td colSpan={2}>Nessun tassello registrato.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function OtherThreads({ others }: { others: VisitSummary['others'] }) {
  if (others.length === 0) {
    return null;
  }
  return (
    <div className="block">
      <h2>Altri filoni attivi</h2>
      <table>
        <tbody>
          {others.map((o) => (
            <tr key={o.title}>
              <td style={{ width: '22%' }}>
                <Dot hue={o.hue} />
                {o.title}
              </td>
              <td>{o.rows.map((r) => `${r.text} (${r.date})`).join('. ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Questions({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return null;
  }
  return (
    <div className="block">
      <h2>Domande della famiglia</h2>
      <ol style={{ margin: '4pt 0 0', paddingLeft: '16pt' }}>
        {questions.map((q) => (
          <li key={q}>{q}</li>
        ))}
      </ol>
    </div>
  );
}

/** Il riepilogo per il medico (4i): un foglio A4 che si stampa o si salva in PDF dal browser. */
export function SummaryDocument({ summary, dateLabel }: { summary: VisitSummary; dateLabel: string }) {
  return (
    <article className="summary-doc" aria-label="Riepilogo per il medico">
      <Header summary={summary} />
      <Medications items={summary.medications} />
      <MainThread main={summary.main} />
      <OtherThreads others={summary.others} />
      <Questions questions={summary.questions} />
      <div className="note">
        {summary.note} Generato il {dateLabel}.
      </div>
    </article>
  );
}
