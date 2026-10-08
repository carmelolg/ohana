import { useEffect, type ReactNode } from 'react';
import { initials } from '../lib/color';

export function Avatar({
  first,
  last,
  nickname,
  url,
  size = 34,
}: {
  first?: string;
  last?: string;
  nickname?: string | null;
  url?: string | null;
  size?: number;
}) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.35 }} aria-hidden>
      {url ? <img src={url} alt="" /> : initials(first, last, nickname)}
    </span>
  );
}

export function Sheet({
  onClose,
  children,
  label,
}: {
  onClose: () => void;
  children: ReactNode;
  label: string;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
