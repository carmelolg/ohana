import { Field } from '../../components/Field';
import { useCareRecipients, useSpace } from '../../lib/data';

interface Props {
  spaceId: string;
  /** La scheda che si sta modificando: il suo membro resta scelto anche se «occupato». */
  recipientId: string;
  userId: string;
  onChange: (userId: string) => void;
}

/** «È già in Ohana»: sceglie, tra i membri dello spazio, chi è la persona assistita (se ha un account). */
export function LinkedMemberField({ spaceId, recipientId, userId, onChange }: Props) {
  const { spaces, memberName } = useSpace();
  const { data: recipients = [] } = useCareRecipients();
  const taken = new Set(
    recipients
      .filter((r) => r.space_id === spaceId && r.id !== recipientId && r.user_id)
      .map((r) => r.user_id),
  );
  const members = (spaces.find((s) => s.id === spaceId)?.space_members ?? []).filter(
    (m) => !taken.has(m.user_id),
  );
  if (members.length === 0) {
    return null;
  }
  return (
    <Field label="È già in Ohana?">
      <select className="input" value={userId} onChange={(e) => onChange(e.target.value)}>
        <option value="">No, non ha un account</option>
        {members.map((m) => (
          <option key={m.user_id} value={m.user_id}>
            {memberName(m.user_id)}
          </option>
        ))}
      </select>
    </Field>
  );
}
