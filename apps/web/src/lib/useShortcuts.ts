import { useEffect } from 'react';

interface Shortcuts {
  onNew: () => void;
  onSearch: () => void;
}

const TYPING_TARGET = /INPUT|TEXTAREA|SELECT/;

/** Scorciatoie da tastiera globali: `N` per creare, `/` per cercare (ignorate mentre si scrive in un campo). */
export function useShortcuts({ onNew, onSearch }: Shortcuts): void {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (TYPING_TARGET.test(target.tagName) || e.metaKey || e.ctrlKey) {
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        onNew();
      }
      if (e.key === '/') {
        e.preventDefault();
        onSearch();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNew, onSearch]);
}
