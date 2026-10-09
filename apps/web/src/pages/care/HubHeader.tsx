import { ageOf, careName } from '@ohana/shared';
import { Link } from 'react-router-dom';
import { CareAvatar } from '../../components/care/CareAvatar';
import { spaceColor } from '../../lib/color';
import { useSpace } from '../../lib/data';
import type { CareRecipient } from '../../lib/types';

/** Intestazione della scheda: foto, nome, spazio, età e chi se ne occupa. */
export function HubHeader({
  recipient,
  me,
  canWrite,
}: {
  recipient: CareRecipient;
  me: string;
  canWrite: boolean;
}) {
  const { spaceById, memberName } = useSpace();
  const space = spaceById(recipient.space_id);
  const label = recipient.label?.trim();
  const caregivers = recipient.caregiver_ids
    .map((id) => (id === me ? 'tu' : memberName(id).split(' ')[0]))
    .filter(Boolean);
  const age = recipient.birth_date ? `${ageOf(recipient.birth_date, new Date())} anni` : null;
  return (
    <div className="care-head">
      <CareAvatar recipient={recipient} />
      <div style={{ flex: 1 }}>
        <div className="care-name">
          {label ? `${recipient.first_name}, ${label.toLowerCase()}` : careName(recipient)}
        </div>
        <div className="care-sub">
          <span className="where">
            <span className="dot" style={{ background: spaceColor(space?.color_hue) }} />
            {[space?.name, age, caregivers.length ? `caregiver ${caregivers.join(', ')}` : null]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      </div>
      {canWrite && (
        <Link className="btn ghost small" to={`/cura/${recipient.id}/modifica`}>
          Scheda
        </Link>
      )}
    </div>
  );
}
