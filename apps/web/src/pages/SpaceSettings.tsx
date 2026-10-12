import { useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { SettingsCard } from '../components/SettingsCard';
import { CategoriesSection } from '../components/CategoriesSection';
import { deleteSpace } from '../lib/api/spaces';
import { spaceColor } from '../lib/color';
import { useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { FeaturesSection } from './space-settings/FeaturesSection';
import { InvitesSection } from './space-settings/InvitesSection';
import { LookSection } from './space-settings/LookSection';
import { MembersSection } from './space-settings/MembersSection';
import { useFollowSelectedSpace } from './space-settings/useFollowSelectedSpace';
import { useSpaceAction } from './space-settings/useSpaceAction';

/** Impostazioni di uno spazio (condivise coi membri): aspetto, persone, categorie, inviti, eliminazione. Il profilo personale è un'altra pagina. */
export function SpaceSettingsPage() {
  const { id = '' } = useParams();
  const { spaceById, myRole, setSelected } = useSpace();
  const dialog = useDialog();
  const nav = useNavigate();
  const { run, refresh } = useSpaceAction();
  useFollowSelectedSpace(id);
  const space = spaceById(id);
  const role = myRole(id);
  if (!space) {
    return <div className="empty">Spazio non trovato</div>;
  }
  const isAdmin = role === 'owner' || role === 'admin';

  async function remove() {
    const confirmed = await dialog.confirm({
      title: `Eliminare «${space!.name}»?`,
      message: 'Spariscono tutti i suoi impegni, la lista della spesa e le spese. Non si può annullare.',
      confirmLabel: 'Elimina spazio',
      danger: true,
    });
    if (!confirmed || !(await run(() => deleteSpace(id), { refresh: false }))) {
      return;
    }
    setSelected('all');
    await refresh();
    nav('/oggi');
  }

  return (
    // key = id: cambiando spazio le sezioni si rimontano, così nomi e interruttori non restano quelli del precedente
    <div key={id} style={{ ['--space' as string]: spaceColor(space.color_hue) }}>
      <BackLink to="/oggi" label="Indietro" history />
      <div className="space-banner">
        <span className="label">Impostazioni dello spazio</span>
        <h2 className="page-title">{space.name}</h2>
        <p className="muted">Valgono per tutti i membri · il tuo ruolo: {role ? ROLE_LABEL[role] : '—'}</p>
      </div>
      <div className="set-page">
        <MembersSection space={space} role={role} />
        {isAdmin && <InvitesSection space={space} />}
        {isAdmin && <LookSection space={space} />}
        {isAdmin && <FeaturesSection space={space} />}
        <CategoriesSection spaceId={id} />
        {role === 'owner' && (
          <SettingsCard
            id="elimina"
            title="Elimina spazio"
            hint="Spariscono impegni, lista della spesa e spese di tutti i membri. Non si può annullare."
          >
            <button className="btn danger set-signout" onClick={remove}>
              Elimina spazio
            </button>
          </SettingsCard>
        )}
      </div>
    </div>
  );
}
