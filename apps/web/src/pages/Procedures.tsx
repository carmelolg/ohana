import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { findProcedureTemplate, PROCEDURE_TEMPLATES, type ProcedureTemplate } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { useProcedures, useSpace } from '../lib/data';
import type { Procedure } from '../lib/types';
import { NewProcedureSheet } from './procedures/NewProcedureSheet';
import { ProcedureRow } from './procedures/ProcedureRow';

/** Pratiche in corso (3e): passaggi, documenti, chi se ne occupa. */
export default function ProceduresPage() {
  const { selected, spaceById, memberName, canWrite, defaultSpace } = useSpace();
  const { data: list = [] } = useProcedures();
  const [sp, setSp] = useSearchParams();
  const [creating, setCreating] = useState<{ tpl: ProcedureTemplate; text: string } | null>(null);
  const writable = canWrite(selected === 'all' ? defaultSpace?.id : selected);

  useEffect(() => {
    const key = sp.get('nuova');
    if (!key) {
      return;
    }
    setCreating({
      tpl: findProcedureTemplate(key) ?? PROCEDURE_TEMPLATES[PROCEDURE_TEMPLATES.length - 1],
      text: sp.get('text') ?? '',
    });
    setSp({}, { replace: true });
  }, [sp, setSp]);

  const scoped = list.filter((p) => selected === 'all' || p.space_id === selected);
  const active = scoped.filter((p) => p.status === 'in_corso');
  const closed = scoped.filter((p) => p.status !== 'in_corso');

  const row = (p: Procedure) => (
    <ProcedureRow
      key={p.id}
      procedure={p}
      space={spaceById(p.space_id)}
      ownerName={p.owner_id ? memberName(p.owner_id) : null}
    />
  );

  return (
    <>
      <BackLink to="/casa" label="Casa" />
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title" style={{ fontSize: 36 }}>
          Pratiche
        </h2>
        {writable && (
          <button
            className="btn small"
            style={{ marginTop: 22 }}
            onClick={() => setCreating({ tpl: PROCEDURE_TEMPLATES[0], text: '' })}
          >
            <Plus size={16} /> Nuova
          </button>
        )}
      </div>
      <div className="list">
        {active.map(row)}
        {active.length === 0 && (
          <div className="empty">Nessuna pratica in corso. Parti da un modello: ISEE, 730, rinnovi…</div>
        )}
      </div>
      {closed.length > 0 && (
        <>
          <div className="label section-label">Concluse</div>
          {closed.map(row)}
        </>
      )}
      {creating && (
        <NewProcedureSheet tpl={creating.tpl} text={creating.text} onClose={() => setCreating(null)} />
      )}
    </>
  );
}
