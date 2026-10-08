import { describeRruleShort, rinviataLabel, type ChoreItem } from '@ohana/shared';
import type { EventRow, Member } from '../../lib/types';
import { CheckButton } from '../CheckButton';
import { Avatar } from '../ui';

interface Props {
  item: ChoreItem<EventRow>;
  assignee: Member['profiles'] | undefined;
  writable: boolean;
  onToggle: () => void;
}

/** Una faccenda di oggi: casella, titolo con ricorrenza (o «rinviata»), avatar di chi la fa. */
export function ChoreRow({ item: { chore, state, daysLate }, assignee, writable, onToggle }: Props) {
  const checked = state === 'done';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', minHeight: 44 }}>
      <CheckButton
        checked={checked}
        label={chore.title}
        disabled={!writable}
        onToggle={onToggle}
        style={{ margin: '0 -12px' }}
      />
      <span
        style={{
          flex: 1,
          fontSize: 15,
          color: checked ? 'var(--text-2)' : undefined,
          textDecoration: checked ? 'line-through' : 'none',
          minWidth: 0,
        }}
      >
        {chore.title}{' '}
        <span className="muted" style={{ fontSize: 13, textDecoration: 'none', display: 'inline-block' }}>
          · {state === 'rinviata' ? rinviataLabel(daysLate) : describeRruleShort(chore.rrule)}
        </span>
      </span>
      {assignee && (
        <Avatar
          size={24}
          first={assignee.first_name}
          last={assignee.last_name}
          nickname={assignee.nickname}
          url={assignee.avatar_url}
        />
      )}
    </div>
  );
}
