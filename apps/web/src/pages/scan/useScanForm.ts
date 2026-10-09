import { useState } from 'react';
import { DOC_FOLDER, DOC_TYPE_LABEL, parseAmount, type DocType, type ParsedDocument } from '@ohana/shared';
import { fromDateInput, toDateInput } from '../../lib/date-input';
import type { LlmFields } from '../../lib/workerApi';

const formatAmount = (n: number) => String(n).replace('.', ',');

/** Campi del documento letto (tutti correggibili) e scelte di salvataggio. */
export function useScanForm(initialSpaceId: string) {
  const [docType, setDocType] = useState<DocType>('altro');
  const [label, setLabel] = useState('');
  const [supplier, setSupplier] = useState('');
  const [amount, setAmount] = useState('');
  const [due, setDue] = useState('');
  const [found, setFound] = useState<ParsedDocument['found'] | null>(null);
  const [candidates, setCandidates] = useState<number[]>([]);
  const [spaceId, setSpaceId] = useState(initialSpaceId);
  const [folder, setFolder] = useState('Altro');
  const [createDue, setCreateDue] = useState(true);
  const [daysBefore, setDaysBefore] = useState(3);
  const [attach, setAttach] = useState(true);
  const [split, setSplit] = useState(false);
  /** Filone di cura a cui aggiungere il referto (vuoto = non aggiungere). */
  const [careThreadId, setCareThreadId] = useState('');

  /** Riempie i campi con ciò che l'OCR ha riconosciuto. */
  function applyParsed(p: ParsedDocument) {
    setDocType(p.docType);
    setLabel(p.docLabel);
    setSupplier(p.supplier ?? '');
    setAmount(p.amount != null ? formatAmount(p.amount) : '');
    setDue(toDateInput(p.dueDate));
    setFolder(p.folder);
    setFound(p.found);
    setCandidates(p.amountCandidates);
    setCreateDue(!!p.dueDate);
  }

  /** Il tipo scelto a mano aggiorna anche l'etichetta e la cartella suggerita. */
  function chooseType(type: DocType) {
    setDocType(type);
    setLabel(DOC_TYPE_LABEL[type]);
    setFolder(DOC_FOLDER[type]);
  }

  /** Integra i campi con la risposta del fallback AI (già sanificata dal server). */
  function applyLlm(r: LlmFields) {
    if (r.docType && r.docType in DOC_TYPE_LABEL) {
      chooseType(r.docType as DocType);
    }
    if (r.supplier) {
      setSupplier(r.supplier);
    }
    if (r.amount != null) {
      setAmount(formatAmount(r.amount));
    }
    if (r.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(r.dueDate)) {
      setDue(r.dueDate);
      setCreateDue(true);
    }
  }

  const amountValue = amount ? parseAmount(amount) : null;
  const dueDate = fromDateInput(due);
  const title = [label || DOC_TYPE_LABEL[docType], supplier].filter(Boolean).join(' · ');
  /** Mancano importo, scadenza o tipo: vale la pena offrire il miglioramento con AI. */
  const needsHelp = found != null && (!found.amount || !found.dueDate || !found.type);

  return {
    docType,
    label,
    supplier,
    setSupplier,
    amount,
    setAmount,
    due,
    setDue,
    candidates,
    spaceId,
    setSpaceId,
    folder,
    setFolder,
    createDue,
    setCreateDue,
    daysBefore,
    setDaysBefore,
    attach,
    setAttach,
    split,
    setSplit,
    careThreadId,
    setCareThreadId,
    applyParsed,
    applyLlm,
    chooseType,
    amountValue,
    dueDate,
    title,
    needsHelp,
    chooseAmount: (value: number) => setAmount(formatAmount(value)),
  };
}

export type ScanForm = ReturnType<typeof useScanForm>;
