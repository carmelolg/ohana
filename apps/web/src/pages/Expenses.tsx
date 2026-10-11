import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { BackLink } from '../components/BackLink';
import { useEvent, useSpace } from '../lib/data';
import { BalancesTab } from './expenses/BalancesTab';
import { ExpenseForm } from './expenses/ExpenseForm';
import { ExpenseList } from './expenses/ExpenseList';

/** Spese condivise: saldi per spazio ed elenco delle spese. Si arriva con `?evento=` dal «+ Spesa» di un impegno. */
export function ExpensesPage() {
  const { selected, spaces, defaultSpace, canWrite } = useSpace();
  const [params, setParams] = useSearchParams();
  const linkedEventId = params.get('evento') ?? undefined;
  const { data: linkedEvent } = useEvent(linkedEventId);
  const [tab, setTab] = useState<'spese' | 'saldi'>('saldi');
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (linkedEventId) {
      setFormOpen(true);
      setTab('spese');
    }
  }, [linkedEventId]);

  const scopeSpaces = spaces.filter((s) => selected === 'all' || s.id === selected);
  const writable = canWrite(selected === 'all' ? defaultSpace?.id : selected);
  const closeForm = () => {
    setFormOpen(false);
    if (linkedEventId) {
      setParams({}, { replace: true });
    }
  };

  return (
    <>
      <BackLink to="/casa" label="Casa" />
      <div className="hstack" style={{ justifyContent: 'space-between' }}>
        <h2 className="page-title">Spese</h2>
        {writable && (
          <button className="btn small" style={{ marginTop: 22 }} onClick={() => setFormOpen(true)}>
            <Plus size={16} /> Spesa
          </button>
        )}
      </div>
      <div className="seg" role="group" aria-label="Sezione">
        <button aria-pressed={tab === 'saldi'} onClick={() => setTab('saldi')}>
          Saldi
        </button>
        <button aria-pressed={tab === 'spese'} onClick={() => setTab('spese')}>
          Spese
        </button>
      </div>

      {tab === 'saldi' && <BalancesTab spaces={scopeSpaces} />}
      {tab === 'spese' && <ExpenseList scope={selected} />}

      {formOpen && (
        <ExpenseForm
          initialSpace={linkedEvent?.space_id ?? (selected === 'all' ? defaultSpace?.id : selected) ?? ''}
          eventId={linkedEvent?.id}
          initialDesc={linkedEvent?.title ?? ''}
          initialAmount={linkedEvent?.amount != null ? String(linkedEvent.amount) : ''}
          onClose={closeForm}
        />
      )}
    </>
  );
}
