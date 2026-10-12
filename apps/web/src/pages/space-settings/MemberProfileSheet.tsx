import { useState } from 'react';
import type { MemberPerson } from '../../lib/api/spaces';
import { fullName } from '../../lib/color';
import type { Member } from '../../lib/types';
import { Sheet } from '../../components/ui';

interface Props {
  member: Member;
  /** Salva e dice se è riuscito: solo allora il foglio si chiude. */
  onSave: (person: MemberPerson) => Promise<boolean>;
  onClose: () => void;
}

/** Il proprietario corregge nome, cognome e soprannome di una persona dello spazio. */
export function MemberProfileSheet({ member, onSave, onClose }: Props) {
  const [first, setFirst] = useState(member.profiles.first_name);
  const [last, setLast] = useState(member.profiles.last_name);
  const [nick, setNick] = useState(member.profiles.nickname ?? '');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const saved = await onSave({ first, last, nick });
    setBusy(false);
    if (saved) {
      onClose();
    }
  }

  return (
    <Sheet onClose={onClose} label={`Dati di ${fullName(member.profiles)}`}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h3 style={{ fontSize: 20 }}>Dati di {fullName(member.profiles)}</h3>
        <input
          className="input"
          required
          placeholder="Nome"
          aria-label="Nome"
          value={first}
          onChange={(e) => setFirst(e.target.value)}
        />
        <input
          className="input"
          required
          placeholder="Cognome"
          aria-label="Cognome"
          value={last}
          onChange={(e) => setLast(e.target.value)}
        />
        <input
          className="input"
          maxLength={40}
          placeholder="Soprannome (facoltativo)"
          aria-label="Soprannome"
          value={nick}
          onChange={(e) => setNick(e.target.value)}
        />
        <button className="btn accent" type="submit" disabled={busy}>
          Salva
        </button>
      </form>
    </Sheet>
  );
}
