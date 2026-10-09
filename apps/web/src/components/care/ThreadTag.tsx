import { careColor } from '../../lib/color';

interface Props {
  hue: number;
  children: React.ReactNode;
  /** `main`: argomento principale della pagina (pieno, senza pallino); `soft`: etichetta in un elenco. */
  variant?: 'soft' | 'main';
}

/** Etichetta colorata di un filone («Cuore», «Cardiologia · Dott. Rossi»). */
export function ThreadTag({ hue, children, variant = 'soft' }: Props) {
  return (
    <span
      className={variant === 'main' ? 'thread-tag primary' : 'thread-tag'}
      style={{ ['--thread' as string]: careColor(hue) }}
    >
      {variant === 'soft' && <span className="dot" />}
      {children}
    </span>
  );
}
