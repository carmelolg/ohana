import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface PromptOpts {
  title: string;
  label?: string;
  placeholder?: string;
  confirmLabel?: string;
  initial?: string;
}
interface ConfirmOpts {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}
type Pending =
  | ({ kind: 'prompt'; resolve: (v: string | null) => void } & PromptOpts)
  | ({ kind: 'confirm'; resolve: (v: boolean) => void } & ConfirmOpts);

interface DialogApi {
  /** Chiede un testo; restituisce null se annullato. */
  prompt: (o: PromptOpts) => Promise<string | null>;
  /** Chiede conferma; restituisce true/false. */
  confirm: (o: ConfirmOpts) => Promise<boolean>;
}
const Ctx = createContext<DialogApi>(null as never);
export const useDialog = () => useContext(Ctx);

const cancelValue = (d: Pending) => (d.kind === 'prompt' ? null : false);

interface ViewProps {
  dialog: Pending;
  value: string;
  onValue: (v: string) => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/** La finestra vera e propria (prompt o conferma), senza stato: lo gestisce il provider. */
function DialogView({ dialog: d, value, onValue, onCancel, onSubmit }: ViewProps) {
  const isConfirm = d.kind === 'confirm';
  return (
    <div className="overlay dialog-overlay" onClick={onCancel}>
      <form
        className="sheet dialog"
        role={isConfirm ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-label={d.title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="grab" />
        <h3 style={{ fontSize: 20, padding: '0 4px' }}>{d.title}</h3>
        {d.kind === 'confirm' && d.message && (
          <p className="muted" style={{ padding: '0 4px 8px' }}>
            {d.message}
          </p>
        )}
        {d.kind === 'prompt' && (
          <div className="field" style={{ padding: '4px 0 8px' }}>
            {d.label && (
              <label className="label" htmlFor="dialog-input">
                {d.label}
              </label>
            )}
            <input
              id="dialog-input"
              className="input"
              autoFocus
              value={value}
              placeholder={d.placeholder}
              onChange={(e) => onValue(e.target.value)}
            />
          </div>
        )}
        <div className="hstack" style={{ marginTop: 6 }}>
          <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={onCancel}>
            Annulla
          </button>
          <button
            type="submit"
            autoFocus={isConfirm}
            className={'btn' + (d.kind === 'confirm' && d.danger ? ' danger-solid' : ' accent')}
            style={{ flex: 1 }}
            disabled={d.kind === 'prompt' && !value.trim()}
          >
            {d.confirmLabel ?? (isConfirm ? 'Conferma' : 'Salva')}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Sostituisce window.prompt / window.confirm con finestre nello stile dell'app. */
export function DialogProvider({ children }: { children: ReactNode }) {
  const [d, setD] = useState<Pending | null>(null);
  const [value, setValue] = useState('');
  const opener = useRef<Element | null>(null);

  const open = useCallback((p: Pending) => {
    opener.current = document.activeElement;
    setD(p);
  }, []);
  const api = useRef<DialogApi>({
    prompt: (o) =>
      new Promise((resolve) => {
        setValue(o.initial ?? '');
        open({ kind: 'prompt', resolve, ...o });
      }),
    confirm: (o) => new Promise((resolve) => open({ kind: 'confirm', resolve, ...o })),
  });

  const close = (result: string | boolean | null) => {
    if (!d) {
      return;
    }
    (d.resolve as (v: string | boolean | null) => void)(result);
    setD(null);
    (opener.current as HTMLElement | null)?.focus?.();
  };

  useEffect(() => {
    if (!d) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') {
        return;
      }
      e.stopImmediatePropagation(); // non chiude anche le sheet sotto
      close(cancelValue(d));
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (d?.kind !== 'prompt') {
      return close(true);
    }
    if (value.trim()) {
      close(value.trim());
    }
  };

  return (
    <Ctx.Provider value={api.current}>
      {children}
      {d && (
        <DialogView
          dialog={d}
          value={value}
          onValue={setValue}
          onCancel={() => close(cancelValue(d))}
          onSubmit={submit}
        />
      )}
    </Ctx.Provider>
  );
}
