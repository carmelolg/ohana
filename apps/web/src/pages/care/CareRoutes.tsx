import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

// Tutta la sezione Cura si scarica solo quando serve: ogni schermata è un pezzo a parte.
const named = <T extends string>(load: () => Promise<Record<T, React.ComponentType>>, key: T) =>
  lazy(() => load().then((m) => ({ default: m[key] })));
const Hub = named(() => import('./Hub'), 'CareHubPage');
const ThreadPage = named(() => import('./ThreadPage'), 'CareThreadPage');
const ThreadForm = named(() => import('./ThreadFormPage'), 'CareThreadFormPage');
const RecipientForm = named(() => import('./RecipientFormPage'), 'CareRecipientFormPage');
const Meds = named(() => import('./MedsPage'), 'CareMedsPage');
const MedicationForm = named(() => import('./MedicationFormPage'), 'CareMedicationFormPage');
const Params = named(() => import('./ParamsPage'), 'CareParamsPage');
const Files = named(() => import('./FilesPage'), 'CareFilesPage');
const Summary = named(() => import('./SummaryPage'), 'CareSummaryPage');
const VisitClose = named(() => import('./VisitClosePage'), 'CareVisitClosePage');

/** Le schermate di Cura, sotto `/cura`. */
export function CareRoutes() {
  return (
    <div className="care-page">
      <Routes>
        <Route index element={<Hub />} />
        <Route path="nuova" element={<RecipientForm />} />
        <Route path="visita/:eventId" element={<VisitClose />} />
        <Route path=":rid" element={<Hub />} />
        <Route path=":rid/modifica" element={<RecipientForm />} />
        <Route path=":rid/filone/nuovo" element={<ThreadForm />} />
        <Route path=":rid/filone/:tid" element={<ThreadPage />} />
        <Route path=":rid/filone/:tid/modifica" element={<ThreadForm />} />
        <Route path=":rid/terapie" element={<Meds />} />
        <Route path=":rid/terapie/nuova" element={<MedicationForm />} />
        <Route path=":rid/terapie/:mid" element={<MedicationForm />} />
        <Route path=":rid/parametri" element={<Params />} />
        <Route path=":rid/documenti" element={<Files />} />
        <Route path=":rid/riepilogo" element={<Summary />} />
      </Routes>
    </div>
  );
}
