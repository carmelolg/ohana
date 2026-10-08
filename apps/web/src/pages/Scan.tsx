import { useAuth } from '../lib/auth';
import { useSpace } from '../lib/data';
import { useToast } from '../lib/toast';
import { ReadFields, SaveOptions } from './scan/ConfirmStep';
import { PickStep, ReadingStep } from './scan/PickStep';
import { Preview, TextDump } from './scan/Preview';
import { useScanActions } from './scan/useScanActions';
import { useScanForm } from './scan/useScanForm';
import { useScanReader } from './scan/useScanReader';

/** Scansione (3g): foto → campi letti → conferma. Non si salva mai senza conferma. */
export default function ScanPage() {
  const { profile } = useAuth();
  const { spaces, selected, defaultSpace, canWrite } = useSpace();
  const toast = useToast();
  const form = useScanForm((selected !== 'all' ? selected : defaultSpace?.id) ?? '');
  const reader = useScanReader(form.applyParsed);
  const { space, memberIds, canSave, busy, saveError, save, improveWithAi, back } = useScanActions(
    form,
    reader,
  );

  return (
    <>
      <div className="hstack" style={{ justifyContent: 'space-between', paddingTop: 8 }}>
        <button
          className="icon-btn"
          style={{ width: 'auto', padding: '0 4px', color: 'var(--text-2)' }}
          onClick={back}
        >
          ‹ Annulla
        </button>
        {reader.phase === 'confirm' && (
          <button
            className="icon-btn"
            style={{ width: 'auto', padding: '0 4px', fontWeight: 600, color: 'var(--accent-ink)' }}
            onClick={save}
            disabled={!canSave}
          >
            {busy ? 'Salvo…' : 'Salva'}
          </button>
        )}
      </div>
      <h2 className="page-title" style={{ fontSize: 30 }}>
        Scansiona documento
      </h2>

      {reader.phase === 'pick' && <PickStep onPick={reader.pick} />}
      {reader.phase === 'reading' && <ReadingStep status={reader.status} progress={reader.progress} />}
      {reader.phase === 'confirm' && (
        <>
          <Preview src={reader.preview} onRetake={reader.reset} />
          {reader.error && (
            <p className="banner warn" role="alert" style={{ marginTop: 12 }}>
              {reader.error}
            </p>
          )}
          {saveError && (
            <p className="error" role="alert" style={{ marginTop: 12 }}>
              {saveError}
            </p>
          )}

          <div className="hstack" style={{ justifyContent: 'space-between', margin: '18px 8px 8px' }}>
            <span className="label">Ho letto</span>
            <span className="muted" style={{ fontSize: 12 }}>
              tocca per correggere
            </span>
          </div>
          <ReadFields form={form} spaces={spaces} space={space} canWrite={canWrite} />

          {reader.text && <TextDump text={reader.text} onCopied={() => toast('Testo copiato')} />}
          {profile?.scan_llm_fallback && form.needsHelp && reader.text && (
            <button
              className="btn ghost small"
              style={{ marginTop: 12 }}
              onClick={improveWithAi}
              disabled={busy}
            >
              Migliora con AI · invia solo il testo letto
            </button>
          )}

          <SaveOptions form={form} memberCount={memberIds.length} />
          <button className="btn" style={{ width: '100%', marginTop: 22 }} onClick={save} disabled={!canSave}>
            {busy ? 'Salvo…' : 'Salva'}
          </button>
          <p className="muted" style={{ fontSize: 12, textAlign: 'center', marginTop: 8 }}>
            Nulla viene salvato finché non tocchi Salva.
          </p>
        </>
      )}
    </>
  );
}
