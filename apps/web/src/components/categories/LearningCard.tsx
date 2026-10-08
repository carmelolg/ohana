interface Props {
  examples: number;
  canReset: boolean;
  onReset: () => void;
}

/** Spiega e permette di azzerare l'apprendimento delle categorie dello spazio. */
export function LearningCard({ examples, canReset, onReset }: Props) {
  return (
    <div className="card" style={{ marginTop: 14, padding: 14 }}>
      <div style={{ fontWeight: 600 }}>L’app impara da te</div>
      <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
        Quando cambi la categoria suggerita, o ne confermi una, l’app se lo ricorda e la prossima volta
        propone quella (funziona anche per le categorie che crei). Tutto resta in questo spazio. Esempi
        imparati finora: <b>{examples}</b>.
      </p>
      {canReset && examples > 0 && (
        <button className="btn ghost small" style={{ marginTop: 8 }} onClick={onReset}>
          Azzera apprendimento
        </button>
      )}
    </div>
  );
}
