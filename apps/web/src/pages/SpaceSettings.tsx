import { useNavigate, useParams } from 'react-router-dom';
import { ROLE_LABEL } from '@ohana/shared';
import { BackLink } from '../components/BackLink';
import { BoardSection } from '../components/BoardSection';
import { CategoriesSection } from '../components/CategoriesSection';
import { deleteSpace } from '../lib/api/spaces';
import { spaceColor } from '../lib/color';
import { useSpace } from '../lib/data';
import { useDialog } from '../lib/dialog';
import { FeaturesSection } from './space-settings/FeaturesSection';
import { InvitesSection } from './space-settings/InvitesSection';
import { LookSection } from './space-settings/LookSection';
import { MembersSection } from './space-settings/MembersSection';
import { useSpaceAction } from './space-settings/useSpaceAction';

/** Gestione di uno spazio: aspetto, persone, bacheca, categorie, inviti, eliminazione. */
export function SpaceSettingsPage() {
  const { id = '' } = useParams();
  const { spaceById, myRole, setSelected } = useSpace();
  const dialog = useDialog();
  const nav = useNavigate();
  const { run, refresh } = useSpaceAction();
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
    <div style={{ ['--space' as string]: spaceColor(space.color_hue) }}>
      <BackLink to="/oggi" label="Indietro" history />
      <h2 className="page-title">{space.name}</h2>
      <p className="muted">Il tuo ruolo: {role ? ROLE_LABEL[role] : '—'}</p>

      {isAdmin && <LookSection space={space} />}
      {isAdmin && <FeaturesSection space={space} />}
      <MembersSection space={space} role={role} />
      <BoardSection spaceId={id} />
      <CategoriesSection spaceId={id} />
      {isAdmin && <InvitesSection space={space} />}

      {role === 'owner' && (
        <div style={{ marginTop: 32 }}>
          <button className="btn danger" onClick={remove}>
            Elimina spazio
          </button>
        </div>
      )}
    </div>
  );
}
