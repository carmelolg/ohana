import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ROLE_LABEL } from '@ohana/shared';
import { acceptInvite, previewInvite, type InvitePreview } from '../lib/api/spaces';
import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { spaceColor } from '../lib/color';
import { LoginForm } from './Login';

export function InvitePage() {
  const { token = '' } = useParams();
  const { session, loading } = useAuth();
  const { setSelected } = useSpace();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [pv, setPv] = useState<InvitePreview | null | undefined>(undefined);
  const [err, setErr] = useState('');

  useEffect(() => {
    void previewInvite(token).then(setPv);
  }, [token]);

  async function accept() {
    try {
      const spaceId = await acceptInvite(token);
      await qc.invalidateQueries({ queryKey: ['spaces'] });
      setSelected(spaceId);
      nav('/oggi', { replace: true });
    } catch {
      setErr('Invito non valido per questo account. Accedi con ' + pv?.email);
    }
  }

  if (pv === undefined || loading) {
    return (
      <div className="empty" role="status" aria-busy="true">
        Caricamento…
      </div>
    );
  }
  if (pv === null || pv.expired) {
    return (
      <div className="login" role="main">
        <div className="hero">
          <h1>Invito scaduto</h1>
          <p>Questo invito non è più valido. Chiedi di riceverne uno nuovo.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="login" role="main">
      <div className="hero">
        <img src="/icons/icon.svg" alt="Ohana" />
        <h1>Ohana</h1>
        <div className="banner" style={{ ['--space' as string]: spaceColor(pv.space_color_hue) }}>
          <strong>{pv.invited_by_name || 'Qualcuno'}</strong> ti ha invitato nello spazio{' '}
          <span className="dot" style={{ background: spaceColor(pv.space_color_hue) }} />{' '}
          <strong>{pv.space_name}</strong> come {ROLE_LABEL[pv.role].toLowerCase()}.
          <br />
          Vedrai solo questo spazio.
        </div>
      </div>
      <div className="actions">
        {session ? (
          <>
            <button className="btn accent" onClick={accept}>
              Entra in {pv.space_name}
            </button>
            {err && (
              <p className="error" role="alert">
                {err}
              </p>
            )}
          </>
        ) : (
          <LoginForm defaultEmail={pv.email} redirectTo={window.location.href} />
        )}
      </div>
    </div>
  );
}
