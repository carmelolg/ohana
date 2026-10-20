import type { ButtonHTMLAttributes } from 'react';
import { useBusyAction } from '../lib/useBusyAction';
import { useToast } from '../lib/toast';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  /** Azione del pulsante (apre un file, lo elimina…): finché dura il pulsante è bloccato. */
  onAction: () => Promise<unknown>;
  /** Testo mentre l'azione è in corso; senza, resta quello normale. */
  busyLabel?: string;
}

/** Pulsante che mostra di stare lavorando: blocca i tocchi ripetuti e, se l'azione fallisce, avvisa con un messaggio. */
export function ActionButton({ onAction, busyLabel, disabled, children, ...rest }: Props) {
  const { busy, run } = useBusyAction();
  const toast = useToast();
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy}
      onClick={() => run(onAction).catch((e: Error) => toast(e.message))}
    >
      {busy && busyLabel ? busyLabel : children}
    </button>
  );
}
