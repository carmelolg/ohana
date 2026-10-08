import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

interface T {
  msg: string;
  action?: { label: string; run: () => void };
}
const Ctx = createContext<(t: string | T) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [t, setT] = useState<T | null>(null);
  const show = useCallback((x: string | T) => {
    setT(typeof x === 'string' ? { msg: x } : x);
    window.setTimeout(() => setT(null), 4500);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {t && (
        <div className="toast" role="status">
          <span>{t.msg}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run();
                setT(null);
              }}
            >
              {t.action.label}
            </button>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
