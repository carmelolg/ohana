import { Link } from 'react-router-dom';
import { BackLink } from '../components/BackLink';
import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { AppearanceSection } from './settings/AppearanceSection';
import { CalendarFeedsSection } from './settings/CalendarFeedsSection';
import { ImportedCalendarsSection } from './settings/ImportedCalendarsSection';
import { NotificationSection } from './settings/NotificationSection';
import { ProfileSection } from './settings/ProfileSection';

/** Profilo e impostazioni personali. Ogni sezione è un componente a sé, con le proprie modifiche. */
export function SettingsPage() {
  const { profile, signOut } = useAuth();
  const { spaces } = useSpace();
  if (!profile) {
    return null;
  }
  return (
    <>
      <BackLink to="/oggi" label="Indietro" history />
      <h2 className="page-title">Profilo e impostazioni</h2>
      <ProfileSection profile={profile} />
      <AppearanceSection profile={profile} />
      <NotificationSection profile={profile} />
      <CalendarFeedsSection />
      <ImportedCalendarsSection />

      <div className="label section-label">Spazi</div>
      {spaces.map((s) => (
        <Link
          key={s.id}
          to={`/spazio/${s.id}`}
          className="kv"
          style={{ color: 'inherit', textDecoration: 'none' }}
        >
          <span style={{ color: 'inherit' }}>{s.name}</span>
          <span className="muted">Gestisci ›</span>
        </Link>
      ))}

      <div style={{ marginTop: 28 }}>
        <button className="btn ghost" onClick={signOut}>
          Esci
        </button>
      </div>
    </>
  );
}
