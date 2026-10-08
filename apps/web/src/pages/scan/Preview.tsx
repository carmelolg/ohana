/** Anteprima del documento scansionato, con il pulsante per rifare la foto. */
export function Preview({ src, onRetake }: { src: string | null; onRetake: () => void }) {
  return (
    <div
      style={{
        position: 'relative',
        margin: '14px 0 0',
        borderRadius: 16,
        overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, var(--surface-2) 0 8px, var(--line) 8px 16px)',
        minHeight: 140,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {src ? (
        <img
          src={src}
          alt="Anteprima del documento"
          style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }}
        />
      ) : (
        <span className="label">Documento</span>
      )}
      <button
        className="pill"
        style={{ position: 'absolute', left: 12, bottom: 12, background: 'var(--surface)' }}
        onClick={onRetake}
      >
        Rifai foto
      </button>
    </div>
  );
}

/** Il testo grezzo letto dall'OCR, comprimibile e copiabile. */
export function TextDump({ text, onCopied }: { text: string; onCopied: () => void }) {
  return (
    <details style={{ marginTop: 12 }}>
      <summary
        className="muted"
        style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', fontSize: 14 }}
      >
        Mostra il testo letto
      </summary>
      <pre
        style={{
          whiteSpace: 'pre-wrap',
          fontSize: 12,
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 12,
          padding: 12,
          maxHeight: 240,
          overflow: 'auto',
        }}
        aria-label="Testo letto dall'OCR"
      >
        {text}
      </pre>
      <button
        type="button"
        className="btn ghost small"
        onClick={() => {
          void navigator.clipboard.writeText(text);
          onCopied();
        }}
      >
        Copia il testo
      </button>
    </details>
  );
}
