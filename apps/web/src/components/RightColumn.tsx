import { useMemo } from 'react';
import { addDaysRome, startOfDayRome } from '@ohana/shared';
import { useAuth } from '../lib/auth';
import { netBalancesIn, transfersFor } from '../lib/balances';
import {
  toOccurrences,
  useEventWindow,
  useExpenses,
  useItems,
  useLists,
  useSettlements,
  useFeature,
  useSpace,
} from '../lib/data';
import { BalanceCard, DeadlinesCard, ShoppingCard } from './right-column/Cards';

const DEADLINE_DAYS = 45;
const MAX_DEADLINES = 5;

/** Colonna destra desktop (2h): scadenze, spesa e saldo. */
export function RightColumn() {
  const { session } = useAuth();
  const { selected, memberName } = useSpace();
  const showShopping = useFeature('spesa');
  const showBalance = useFeature('spese');
  const { data: events = [] } = useEventWindow();
  const { data: lists = [] } = useLists();
  const { data: items = [] } = useItems();
  const { data: expenses = [] } = useExpenses();
  const { data: settlements = [] } = useSettlements();
  const me = session?.user.id ?? '';
  const inScope = (spaceId: string) => selected === 'all' || spaceId === selected;

  const from = useMemo(() => startOfDayRome(new Date()), []);
  const to = useMemo(() => addDaysRome(from, DEADLINE_DAYS), [from]);
  const deadlines = toOccurrences(events, from, to, selected)
    .filter((o) => o.event.categories?.slug === 'scadenza' && o.event.status === 'open')
    .slice(0, MAX_DEADLINES);
  const listIds = new Set(lists.filter((l) => inScope(l.space_id)).map((l) => l.id));
  const open = items.filter((i) => listIds.has(i.list_id) && !i.checked);
  const transfers = transfersFor(netBalancesIn(expenses, settlements, inScope), me);

  return (
    <aside className="rightcol" aria-label="Riepilogo">
      <DeadlinesCard deadlines={deadlines} />
      {showShopping && <ShoppingCard open={open} />}
      {showBalance && <BalanceCard transfers={transfers} me={me} nameOf={memberName} />}
    </aside>
  );
}
