import { careName } from '@ohana/shared';
import { useAuth } from '../../lib/auth';
import { useScopedRecipients } from '../../lib/data';
import type { CareRecipient } from '../../lib/types';
import { OptionRow } from './OptionRow';

/** «Registra per Papà»: per chi fa da caregiver, un parametro o un episodio sono a due tocchi dal «+». */
export function CareRecordOptions({ onPick }: { onPick: (recipient: CareRecipient) => void }) {
  const { session } = useAuth();
  const me = session?.user.id ?? '';
  const mine = useScopedRecipients().filter((r) => r.caregiver_ids.includes(me));
  return (
    <>
      {mine.map((r) => (
        <OptionRow
          key={r.id}
          option={{
            kind: 'cura',
            badge: 'CU',
            title: `Registra per ${careName(r)}`,
            sub: 'Pressione, peso, episodi',
          }}
          recommended={false}
          parsed={null}
          onPick={() => onPick(r)}
        />
      ))}
    </>
  );
}
