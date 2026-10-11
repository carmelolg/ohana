import { DAY_MS, formatEuro } from '@ohana/shared';
import { AreaCard } from '../components/AreaCard';
import { netBalancesIn } from '../lib/balances';
import { useAuth } from '../lib/auth';
import {
  useDeadlines,
  useDocuments,
  useExpenses,
  useFeatures,
  useItems,
  useLists,
  useMaintenances,
  useProcedures,
  useSettlements,
  useSpace,
} from '../lib/data';
import { maintenanceState, moreStatus } from './areaStatus';

const SOON_DAYS = 30;

/** Casa: le funzioni della casa a un tap, con lo stato già visibile su ogni card. */
export function CasaPage() {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const { selected, current } = useSpace();
  const { data: procedures = [] } = useProcedures();
  const { data: maintenances = [] } = useMaintenances();
  const { data: documents = [] } = useDocuments();
  const { data: expenses = [] } = useExpenses();
  const { data: settlements = [] } = useSettlements();
  const { data: lists = [] } = useLists();
  const { data: items = [] } = useItems();
  const isOn = useFeatures();
  const { deadlines, from } = useDeadlines(SOON_DAYS);

  const inScope = (id: string) => selected === 'all' || id === selected;
  const { open, dues, soon, expiring } = moreStatus(
    { procedures, maintenances, documents },
    inScope,
    new Date(),
  );
  const net = netBalancesIn(expenses, settlements, inScope)[me] ?? 0;
  const listIds = new Set(lists.filter((l) => inScope(l.space_id)).map((l) => l.id));
  const deadlinesSoon = deadlines.filter((d) => +d.at <= from.getTime() + SOON_DAYS * DAY_MS).length;
  const toBuy = items.filter((i) => !i.checked && listIds.has(i.list_id)).length;

  return (
    <>
      <h2 className="page-title">Casa</h2>
      <div className="more-grid">
        {isOn('spesa') && (
          <AreaCard
            to="/spesa"
            title="Spesa"
            sub="Liste e carrello"
            state={toBuy ? `${toBuy} da comprare` : undefined}
          />
        )}
        {isOn('spese') && (
          <AreaCard
            to="/spese"
            title="Spese"
            sub={`Saldo ${current ? current.name : 'tutti gli spazi'}`}
            state={
              Math.abs(net) >= 0.005 ? `${net > 0 ? '+ ' : '− '}${formatEuro(Math.abs(net))}` : undefined
            }
          />
        )}
        <AreaCard
          to="/scadenze"
          title="Scadenze"
          sub="Bollette, bolli, rinnovi"
          state={deadlinesSoon ? `${deadlinesSoon} entro 30 gg` : undefined}
        />
        {isOn('manutenzioni') && (
          <AreaCard
            to="/manutenzioni"
            title="Manutenzioni"
            sub="Caldaia, gomme, condizionatore"
            state={maintenanceState(soon.length, dues[0])}
          />
        )}
        {isOn('documenti') && (
          <AreaCard
            to="/documenti"
            title="Documenti"
            sub="Referti, bollette, garanzie"
            state={expiring.length ? `${expiring.length} in scadenza` : undefined}
          />
        )}
        {isOn('pratiche') && (
          <AreaCard
            to="/pratiche"
            title="Pratiche"
            sub="ISEE mamma, rinnovo patente"
            state={open.length ? `${open.length} in corso` : undefined}
          />
        )}
      </div>
    </>
  );
}
