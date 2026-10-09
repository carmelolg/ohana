import { lazy } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { FeatureGate } from './components/FeatureGate';
import { AuthProvider, useAuth } from './lib/auth';
import { SpaceProvider, useSpace } from './lib/data';
import { ToastProvider } from './lib/toast';
import { DialogProvider } from './lib/dialog';
import { configured } from './lib/supabase';
import { Shell } from './components/Shell';
import { LoginPage } from './pages/Login';
import { InvitePage } from './pages/Invite';
import { Onboarding } from './pages/Onboarding';
import { TodayPage } from './pages/Today';

// Pagine secondarie caricate al bisogno: il bundle iniziale resta piccolo (Oggi, accesso e struttura dell'app).
const named = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, key: T) =>
  lazy(() => load().then((m) => ({ default: m[key] })));
const CalendarPage = named(() => import('./pages/Calendar'), 'CalendarPage');
const EventEditor = named(() => import('./pages/EventEditor'), 'EventEditor');
const ShoppingPage = named(() => import('./pages/Shopping'), 'ShoppingPage');
const ContactsPage = named(() => import('./pages/Contacts'), 'ContactsPage');
const ExpensesPage = named(() => import('./pages/Expenses'), 'ExpensesPage');
const MorePage = named(() => import('./pages/More'), 'MorePage');
const SettingsPage = named(() => import('./pages/Settings'), 'SettingsPage');
const SpaceSettingsPage = named(() => import('./pages/SpaceSettings'), 'SpaceSettingsPage');
const EmergencyPage = lazy(() => import('./pages/Emergency'));
const MaintenancesPage = lazy(() => import('./pages/Maintenances'));
const ProceduresPage = lazy(() => import('./pages/Procedures'));
const ProcedureDetailPage = lazy(() => import('./pages/ProcedureDetail'));
const DocumentsPage = lazy(() => import('./pages/Documents'));
const ScanPage = lazy(() => import('./pages/Scan'));
const CareRoutes = named(() => import('./pages/care/CareRoutes'), 'CareRoutes');
const VisitPrepPage = named(() => import('./pages/care/VisitPrepPage'), 'VisitPrepPage');

function Gate() {
  const { session, loading } = useAuth();
  const { spaces, loading: spacesLoading } = useSpace();
  const loc = useLocation();
  if (!configured) {
    return (
      <div className="login" role="main">
        <div className="hero">
          <h1>Ohana</h1>
          <p>
            Mancano le variabili <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. Copia{' '}
            <code>.env.example</code> in <code>.env</code> e riavvia.
          </p>
        </div>
      </div>
    );
  }
  if (loading) {
    return <div className="empty">Caricamento…</div>;
  }
  if (loc.pathname.startsWith('/invito/')) {
    return (
      <Routes>
        <Route path="/invito/:token" element={<InvitePage />} />
      </Routes>
    );
  }
  if (!session) {
    return <LoginPage />;
  }
  if (spacesLoading) {
    return <div className="empty">Caricamento…</div>;
  }
  if (spaces.length === 0 && !loc.pathname.startsWith('/benvenuto')) {
    return <Navigate to="/benvenuto" replace />;
  }
  return <AppRoutes />;
}

/** Le pagine dell'app: ogni funzione opzionale di uno spazio passa da `FeatureGate`. */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/benvenuto" element={<Onboarding />} />
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/oggi" replace />} />
        <Route path="/oggi" element={<TodayPage />} />
        <Route path="/calendario" element={<CalendarPage />} />
        <Route path="/nuovo" element={<EventEditor />} />
        <Route path="/evento/:id" element={<EventEditor />} />
        <Route
          path="/spesa"
          element={
            <FeatureGate feature="spesa">
              <ShoppingPage />
            </FeatureGate>
          }
        />
        <Route path="/altro" element={<MorePage />} />
        <Route path="/rubrica" element={<ContactsPage />} />
        <Route
          path="/spese"
          element={
            <FeatureGate feature="spese">
              <ExpensesPage />
            </FeatureGate>
          }
        />
        <Route path="/impostazioni" element={<SettingsPage />} />
        <Route path="/spazio/:id" element={<SpaceSettingsPage />} />
        <Route path="/emergenza" element={<EmergencyPage />} />
        <Route
          path="/manutenzioni"
          element={
            <FeatureGate feature="manutenzioni">
              <MaintenancesPage />
            </FeatureGate>
          }
        />
        <Route
          path="/pratiche"
          element={
            <FeatureGate feature="pratiche">
              <ProceduresPage />
            </FeatureGate>
          }
        />
        <Route
          path="/pratiche/:id"
          element={
            <FeatureGate feature="pratiche">
              <ProcedureDetailPage />
            </FeatureGate>
          }
        />
        <Route
          path="/documenti"
          element={
            <FeatureGate feature="documenti">
              <DocumentsPage />
            </FeatureGate>
          }
        />
        <Route
          path="/scansiona"
          element={
            <FeatureGate feature="documenti">
              <ScanPage />
            </FeatureGate>
          }
        />
        <Route
          path="/cura/*"
          element={
            <FeatureGate feature="cura">
              <CareRoutes />
            </FeatureGate>
          }
        />
        <Route path="/evento/:id/prepara" element={<VisitPrepPage />} />
        <Route path="*" element={<Navigate to="/oggi" replace />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SpaceProvider>
        <ToastProvider>
          <DialogProvider>
            <Gate />
          </DialogProvider>
        </ToastProvider>
      </SpaceProvider>
    </AuthProvider>
  );
}
