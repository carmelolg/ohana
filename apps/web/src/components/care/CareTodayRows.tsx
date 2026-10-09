import { Link } from 'react-router-dom';
import { useCareTodayRows } from '../../lib/data';
import { CareAvatar } from './CareAvatar';

/** La cura occupa una sola riga in Oggi (4g), solo per chi è caregiver e solo se c'è ancora qualcosa da fare. */
export function CareTodayRows() {
  const rows = useCareTodayRows();
  return (
    <>
      {rows.map((row) => (
        <Link key={row.recipient.id} className="care-today" to={`/cura/${row.recipient.id}`}>
          <CareAvatar recipient={row.recipient} size={36} />
          <span style={{ flex: 1 }}>
            <b>{row.title}</b>
            <span>{row.sub}</span>
          </span>
          <span aria-hidden>Apri ›</span>
        </Link>
      ))}
    </>
  );
}
