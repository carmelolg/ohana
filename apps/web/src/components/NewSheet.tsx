import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseQuick, type ParsedKind } from '@ohana/shared';
import { fullName } from '../lib/color';
import { useCareThreads, useFeatures, useSpace } from '../lib/data';
import type { CareRecipient } from '../lib/types';
import { RecordSheet } from './care/RecordSheet';
import { CareRecordOptions } from './new-sheet/CareRecordOptions';
import { useToast } from '../lib/toast';
import { useVoice } from '../lib/voice';
import { NoteComposer } from './NoteComposer';
import { OptionRow } from './new-sheet/OptionRow';
import { destinationFor, optionsFor } from './new-sheet/options';
import { PromptBar } from './new-sheet/PromptBar';
import { Sheet } from './ui';
import { UnderstoodCard } from './new-sheet/UnderstoodCard';
import { understoodChips } from './new-sheet/understood';
import { X } from 'lucide-react';

const EXAMPLES = [
  'plastica ogni giovedì',
  'dentista domani alle 15',
  'caldaia ogni anno a novembre',
  'nota: latte in frigo',
];

const MIN_CHARS_TO_DETECT = 3;

/** Spazi e membri nel formato che il parser sa riconoscere (`#spazio`, `@nome`). */
function useParserContext() {
  const { spaces } = useSpace();
  return useMemo(() => {
    const members = new Map<string, string>();
    for (const s of spaces) {
      for (const m of s.space_members) {
        members.set(m.user_id, fullName(m.profiles));
      }
    }
    return {
      spaces: spaces.map((s) => ({ id: s.id, name: s.name })),
      members: [...members].map(([id, name]) => ({ id, name })),
    };
  }, [spaces]);
}

/** «+» centrale (3b): un solo punto d'ingresso. Il testo libero capisce da solo cosa si sta creando. */
export function NewSheet({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const toast = useToast();
  const ctx = useParserContext();
  const isOn = useFeatures();
  const [text, setText] = useState('');
  const [noteText, setNoteText] = useState<string | null>(null);
  const [recordFor, setRecordFor] = useState<CareRecipient | null>(null);
  const { data: careThreads = [] } = useCareThreads();
  const voice = useVoice((spoken) => setText((t) => (t ? t.trimEnd() + ' ' : '') + spoken));

  const parsed = useMemo(() => (text.trim() ? parseQuick(text, new Date(), ctx) : null), [text, ctx]);
  const detected: ParsedKind | null =
    parsed && text.trim().length >= MIN_CHARS_TO_DETECT ? parsed.kind : null;

  const go = (kind: ParsedKind) => {
    const destination = destinationFor(kind, text, parsed);
    if (destination.type === 'note') {
      return setNoteText(destination.text);
    }
    onClose();
    nav(destination.to);
  };
  const toggleVoice = () => {
    if (!voice.toggle()) {
      toast('Dettatura non supportata qui: usa il microfono della tastiera');
    }
  };

  if (noteText !== null) {
    return <NoteComposer initialText={noteText} onClose={onClose} />;
  }
  if (recordFor) {
    return (
      <RecordSheet
        recipient={recordFor}
        threads={careThreads.filter((t) => t.recipient_id === recordFor.id)}
        onClose={onClose}
      />
    );
  }
  return (
    <Sheet onClose={onClose} label="Cosa vuoi creare?">
      <div className="sheet-head">
        <span className="sheet-title">Aggiungi</span>
        <button type="button" className="sheet-close" aria-label="Chiudi" onClick={onClose}>
          <X size={18} strokeWidth={2} />
        </button>
      </div>
      <PromptBar
        text={text}
        listening={voice.listening}
        onChange={setText}
        onSubmit={() => go(detected ?? 'appuntamento')}
        onToggleVoice={toggleVoice}
      />
      {detected && parsed && (
        <UnderstoodCard
          title={parsed.title || text.trim()}
          kindLabel={optionsFor(detected, isOn).find((o) => o.kind === detected)?.title ?? 'Impegno'}
          chips={understoodChips(parsed, ctx)}
        />
      )}
      {!detected && (
        <div className="examples">
          <span className="label">Prova a scrivere</span>
          <div className="examples-row">
            {EXAMPLES.map((x) => (
              <button key={x} type="button" className="example" onClick={() => setText(x)}>
                {x}
              </button>
            ))}
          </div>
        </div>
      )}
      <div role="list" className="option-grid">
        {optionsFor(detected, isOn).map((option) => (
          <OptionRow
            key={option.kind}
            option={option}
            recommended={detected === option.kind}
            parsed={parsed}
            onPick={() => go(option.kind)}
          />
        ))}
        <CareRecordOptions onPick={setRecordFor} />
      </div>
      <p className="muted sheet-hint">Il testo libero capisce da solo cosa stai creando.</p>
    </Sheet>
  );
}
