import { DoneStep, InviteStep, ProfileStep, SpaceStep } from './onboarding/Steps';
import { useOnboarding } from './onboarding/useOnboarding';

/** Primo accesso a passi: persona → primo spazio (nome, colore, funzioni) → invito → pronto. */
export function Onboarding() {
  const o = useOnboarding();
  return (
    <div className="login" role="main">
      {o.step === 'profile' && <ProfileStep person={o.person} onNext={() => o.setStep('space')} />}
      {o.step === 'space' && (
        <SpaceStep
          space={o.space}
          err={o.err}
          onNext={() => void o.createFirstSpace()}
          onBack={() => o.setStep('profile')}
        />
      )}
      {o.step === 'invite' && o.spaceId && (
        <InviteStep spaceId={o.spaceId} spaceName={o.space.name} onNext={() => o.setStep('done')} />
      )}
      {o.step === 'done' && <DoneStep onFinish={o.finish} />}
    </div>
  );
}
