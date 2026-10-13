import { LogOut, UserRound } from 'lucide-react';
import { BackLink } from '../components/BackLink';
import { useAuth } from '../lib/auth';
import { AppearanceSection } from './settings/AppearanceSection';
import { CalendarFeedsSection } from './settings/CalendarFeedsSection';
import { ImportedCalendarsSection } from './settings/ImportedCalendarsSection';
import { NotificationSection } from './settings/NotificationSection';
import { ProfileSection } from './settings/ProfileSection';
import { ScanSection } from './settings/ScanSection';
import { TourSection } from './settings/TourSection';
import { SettingsCard } from '../components/SettingsCard';

/** Il mio profilo: solo ciò che riguarda me, in ogni spazio. Le impostazioni di uno spazio stanno nella sua pagina. */
export function SettingsPage() {
  const { profile, signOut } = useAuth();
  if (!profile) {
    return null;
  }
  return (
    <>
      <BackLink to="/oggi" label="Indietro" history />
      <h2 className="page-title">Il mio profilo</h2>
      <p className="scope-note scope-personal">
        <UserRound size={16} strokeWidth={1.75} aria-hidden /> Solo per te: vale in tutti i tuoi spazi.
      </p>
      <div className="set-page">
        <ProfileSection profile={profile} />
        <AppearanceSection profile={profile} />
        <NotificationSection profile={profile} />
        <CalendarFeedsSection />
        <ImportedCalendarsSection />
        <ScanSection profile={profile} />
        <TourSection />
        <SettingsCard id="account" title="Account">
          <button className="btn ghost set-signout" onClick={signOut}>
            <LogOut size={18} strokeWidth={1.75} aria-hidden /> Esci
          </button>
        </SettingsCard>
      </div>
    </>
  );
}
