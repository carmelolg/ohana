import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}

/** Un blocco della pagina del profilo: titolo, una riga che spiega a cosa serve, poi le opzioni. */
export function SettingsCard({ id, title, hint, children }: Props) {
  return (
    <section id={id} className="set-card" aria-labelledby={`${id}-title`}>
      <header className="set-card-head">
        <h3 id={`${id}-title`}>{title}</h3>
        {hint && <p className="muted">{hint}</p>}
      </header>
      {children}
    </section>
  );
}
