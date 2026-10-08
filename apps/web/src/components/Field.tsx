import type { ReactNode } from 'react';

/** Etichetta sopra un controllo del modulo. */
export function Field({ label, children, flex }: { label: string; children: ReactNode; flex?: boolean }) {
  return (
    <label className="field" style={flex ? { flex: 1 } : undefined}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
