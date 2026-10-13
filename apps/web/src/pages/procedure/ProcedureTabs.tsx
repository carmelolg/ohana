export type ProcedureTab = 'passaggi' | 'cronologia' | 'documenti';

interface Props {
  tab: ProcedureTab;
  onTab: (tab: ProcedureTab) => void;
  /** Documenti richiesti ancora da caricare: il numero resta visibile anche quando la scheda è chiusa. */
  missingDocs: number;
}

/** Schede della pratica: l'iter, la cronologia e i documenti non si impilano più in un'unica pagina lunga. */
export function ProcedureTabs({ tab, onTab, missingDocs }: Props) {
  const items: { key: ProcedureTab; label: string }[] = [
    { key: 'passaggi', label: 'Passaggi' },
    { key: 'cronologia', label: 'Cronologia' },
    { key: 'documenti', label: missingDocs > 0 ? `Documenti · ${missingDocs} da caricare` : 'Documenti' },
  ];
  return (
    <div className="proc-tabs" role="tablist" aria-label="Sezioni della pratica">
      {items.map((i) => (
        <button
          key={i.key}
          role="tab"
          aria-selected={tab === i.key}
          className="proc-tab"
          onClick={() => onTab(i.key)}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
