import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { holeClip, placePopover } from './placement';
import { TOUR_STEPS, type TourOverlay } from './steps';
import { useTourTarget } from './useTourTarget';

interface Props {
  onClose: () => void;
  /** Apre o chiude il pannello richiesto dal passo (il «+»). */
  onOverlay: (overlay: TourOverlay | null) => void;
}

/**
 * Guida sull'app vera: per ogni passo porta alla pagina giusta, oscura il resto e lascia libero l'elemento
 * evidenziato, che si può toccare davvero. Il fumetto spiega e permette di andare avanti o indietro.
 */
export function Tour({ onClose, onOverlay }: Props) {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [index, setIndex] = useState(0);
  const step = TOUR_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === TOUR_STEPS.length - 1;
  const target = useTourTarget(step.targets, step.id);
  const next = () => setIndex((i) => Math.min(i + 1, TOUR_STEPS.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    onOverlay(step.overlay ?? null);
    if (pathname !== step.route) {
      nav(step.route);
    }
    // si reagisce al cambio di passo, non a ogni navigazione: così un tocco dell'utente altrove non viene annullato
  }, [step.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => onOverlay(null), [onOverlay]);

  useEffect(() => {
    const el = target?.el;
    if (!el || !step.clickAdvances) {
      return;
    }
    el.addEventListener('click', next);
    return () => el.removeEventListener('click', next);
  }, [target?.el, step.clickAdvances]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const box = target?.box ?? null;
  const place = placePopover(box, viewport);

  return (
    <div className="tour-layer">
      <div className="tour-dim" style={box ? { clipPath: holeClip(box, viewport) } : undefined} />
      {box && (
        <div
          className="tour-ring"
          aria-hidden
          style={{ top: box.top - 6, left: box.left - 6, width: box.width + 12, height: box.height + 12 }}
        />
      )}
      <div
        className={'tour-pop' + (box ? '' : ' centered')}
        role="dialog"
        aria-label="Guida a Ohana"
        style={{ top: place.top, bottom: place.bottom, left: place.left, width: place.width }}
      >
        <button className="sheet-close tour-close" aria-label="Chiudi la guida" onClick={onClose}>
          <X size={20} strokeWidth={1.75} aria-hidden />
        </button>
        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-text">{step.text}</p>
        {step.example && (
          <p className="tour-example">
            Prova: <q>{step.example}</q>
          </p>
        )}
        <ol className="tour-dots" aria-label={`Passo ${index + 1} di ${TOUR_STEPS.length}`}>
          {TOUR_STEPS.map((s, i) => (
            <li key={s.id} className={i === index ? 'on' : undefined} />
          ))}
        </ol>
        <div className="tour-nav">
          <button className="btn ghost small" onClick={isFirst ? onClose : back}>
            {isFirst ? 'Salta' : 'Indietro'}
          </button>
          <button className="btn accent small" autoFocus onClick={isLast ? onClose : next}>
            {isLast ? 'Fine' : 'Avanti'}
          </button>
        </div>
      </div>
    </div>
  );
}
