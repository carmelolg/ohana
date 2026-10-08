import { formatEuro } from '@ohana/shared';
import type { Member } from '../../lib/types';
import { fullName } from '../../lib/color';
import type { Share, SplitMode } from './splits';

interface Props {
  member: Member;
  isMe: boolean;
  included: boolean;
  mode: SplitMode;
  equalShares: Share[];
  customValue: string;
  onToggle: () => void;
  onCustom: (value: string) => void;
}

/** Una persona nella divisione: casella di partecipazione e quota (calcolata o da scrivere). */
export function ShareRow({
  member: m,
  isMe,
  included,
  mode,
  equalShares,
  customValue,
  onToggle,
  onCustom,
}: Props) {
  return (
    <div className="hstack" style={{ minHeight: 44 }}>
      <label className="hstack" style={{ flex: 1 }}>
        <input type="checkbox" style={{ width: 22, height: 22 }} checked={included} onChange={onToggle} />
        {isMe ? 'Io' : fullName(m.profiles)}
      </label>
      {included && mode === 'uguali' && (
        <span className="mono">
          {formatEuro(equalShares.find((s) => s.userId === m.user_id)?.amount ?? 0)}
        </span>
      )}
      {included && mode === 'personalizzate' && (
        <input
          className="input"
          style={{ width: 110 }}
          inputMode="decimal"
          aria-label={`Quota ${fullName(m.profiles)}`}
          value={customValue}
          onChange={(e) => onCustom(e.target.value)}
          placeholder="0,00"
        />
      )}
    </div>
  );
}
