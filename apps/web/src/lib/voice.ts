import { useCallback, useEffect, useRef, useState } from 'react';

type SR = {
  start(): void;
  stop(): void;
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: { 0: { transcript: string } }[] & { length: number } }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

/** Dettatura in italiano (Web Speech API). `supported` è falso sui browser senza l'API: la tastiera resta l'alternativa. */
export function useVoice(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const rec = useRef<SR | null>(null);
  const cb = useRef(onText);
  cb.current = onText;
  const Ctor = (() => {
    type W = { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const w = window as unknown as W;
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  })();

  useEffect(() => () => rec.current?.stop(), []);

  const toggle = useCallback(() => {
    if (!Ctor) {
      return false;
    }
    if (listening) {
      rec.current?.stop();
      return true;
    }
    const r = new Ctor();
    r.lang = 'it-IT';
    r.interimResults = false;
    r.onresult = (e) => cb.current(e.results[e.results.length - 1][0].transcript.trim());
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
    return true;
  }, [Ctor, listening]);

  return { supported: !!Ctor, listening, toggle };
}
