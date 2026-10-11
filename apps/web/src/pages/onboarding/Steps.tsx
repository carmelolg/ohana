import { useState } from 'react';
import { SPACE_FEATURES, type SpaceFeature } from '@ohana/shared';
import { HueSwatches } from '../../components/HueSwatches';
import { createInvite, inviteLink } from '../../lib/api/spaces';
import { useAuth } from '../../lib/auth';
import { shareInviteLink } from '../../lib/shareInvite';

const NAME_SUGGESTIONS = ['Casa mia', 'Famiglia', 'Mamma e papà'];

export interface PersonProps {
  first: string;
  setFirst: (v: string) => void;
  last: string;
  setLast: (v: string) => void;
  nick: string;
  setNick: (v: string) => void;
}

export function ProfileStep({ person, onNext }: { person: PersonProps; onNext: () => void }) {
  return (
    <form
      className="hero"
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <h1>Benvenuto</h1>
      <p>Come ti chiami? Gli altri membri vedranno il tuo nome o il tuo soprannome.</p>
      <input
        className="input"
        required
        placeholder="Nome"
        aria-label="Nome"
        value={person.first}
        onChange={(e) => person.setFirst(e.target.value)}
      />
      <input
        className="input"
        placeholder="Cognome"
        aria-label="Cognome"
        value={person.last}
        onChange={(e) => person.setLast(e.target.value)}
      />
      <input
        className="input"
        maxLength={40}
        placeholder="Soprannome (facoltativo, è il nome che vedranno gli altri)"
        aria-label="Soprannome"
        value={person.nick}
        onChange={(e) => person.setNick(e.target.value)}
      />
      <button className="btn accent" type="submit">
        Continua
      </button>
    </form>
  );
}

interface SpaceProps {
  name: string;
  setName: (v: string) => void;
  hue: number;
  setHue: (v: number) => void;
  disabled: string[];
  toggle: (key: SpaceFeature) => void;
}

export function SpaceStep(props: { space: SpaceProps; err: string; onNext: () => void; onBack: () => void }) {
  const { space, err, onNext, onBack } = props;
  return (
    <form
      className="hero"
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
    >
      <h1 className="step-title">Crea il tuo primo spazio</h1>
      <p>
        Uno spazio è il gruppo con cui condividi le cose. Potrai crearne altri, per esempio per i genitori.
      </p>
      <span className="step-label">Come lo chiami?</span>
      <div className="chips-row">
        {NAME_SUGGESTIONS.map((n) => (
          <button
            type="button"
            key={n}
            className="chip"
            aria-pressed={space.name === n}
            onClick={() => space.setName(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <input
        className="input"
        required
        placeholder="Nome dello spazio"
        aria-label="Nome dello spazio"
        value={space.name}
        onChange={(e) => space.setName(e.target.value)}
      />
      <span className="step-label">Colore</span>
      <HueSwatches value={space.hue} onChange={space.setHue} />
      <span className="step-label">Cosa vi serve? (si cambia quando vuoi)</span>
      <div className="chips-row">
        {SPACE_FEATURES.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            className="chip"
            aria-pressed={!space.disabled.includes(key)}
            onClick={() => space.toggle(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {err && (
        <p className="error" role="alert">
          {err}
        </p>
      )}
      <button className="btn accent" type="submit">
        Continua
      </button>
      <button className="btn ghost" type="button" onClick={onBack}>
        Indietro
      </button>
    </form>
  );
}

interface InviteProps {
  spaceId: string;
  spaceName: string;
  onNext: () => void;
}

export function InviteStep({ spaceId, spaceName, onNext }: InviteProps) {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    try {
      const created = await createInvite(spaceId, email, 'member', session!.user.id);
      const outcome = await shareInviteLink(spaceName, inviteLink(created));
      setMsg(outcome === 'copied' ? 'Link copiato · valido 7 giorni' : 'Invito condiviso');
      setEmail('');
    } catch (e2) {
      setMsg((e2 as Error).message);
    }
  }

  return (
    <div className="hero">
      <h1 className="step-title">Invita chi vive con te</h1>
      <p>Manda il link su WhatsApp o via email. Entrano con un tocco.</p>
      <form className="stack" onSubmit={invite}>
        <input
          className="input"
          type="email"
          required
          placeholder="Email della persona"
          aria-label="Email da invitare"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn ghost" type="submit">
          Condividi il link
        </button>
      </form>
      {msg && <p role="status">{msg}</p>}
      <div className="more-note">
        <b>Segui un genitore?</b> Dopo potrai creare lo spazio «Mamma e papà» con la Cura e invitare anche la
        badante con il ruolo «Solo Cura».
      </div>
      <button className="btn accent" type="button" onClick={onNext}>
        Inizia a usare Ohana
      </button>
      <button className="btn ghost" type="button" onClick={onNext}>
        Lo faccio dopo
      </button>
    </div>
  );
}

export function DoneStep({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="hero">
      <h1 className="step-title">Tutto pronto</h1>
      <p>
        Prova subito: tocca <b>+</b> e scrivi «plastica ogni giovedì».
      </p>
      <button className="btn accent" type="button" onClick={onFinish}>
        Vai a Oggi
      </button>
    </div>
  );
}
