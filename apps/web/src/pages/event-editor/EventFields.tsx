import { CareThreadSelect } from '../../components/care/CareThreadSelect';
import { AssigneeField, CategoryField, ContactField, RepeatField, SpaceField, WhenField } from './fieldParts';
import { ReminderField } from './ReminderField';
import type { EventForm } from './useEventForm';

/** Il blocco «Ho capito»: spazio, quando, categoria, contatto, assegnatario, ripetizione e promemoria. */
export function EventFields({ form }: { form: EventForm }) {
  return (
    <div className="group">
      <SpaceField form={form} />
      <WhenField form={form} />
      {!form.isChore && (
        <>
          <CategoryField form={form} />
          <ContactField form={form} />
          <CareThreadSelect
            spaceId={form.spaceId}
            value={form.careThreadId}
            onChange={form.setCareThreadId}
          />
        </>
      )}
      <AssigneeField form={form} />
      <RepeatField form={form} />
      {form.isChore ? (
        <p className="muted" style={{ fontSize: 13, padding: '10px 0' }}>
          Le faccende non mandano email né promemoria. Se vuoi, in Impostazioni puoi attivare un unico
          riepilogo push alle 8:00. Se non la fai, passa al giorno dopo come «rinviata», senza diventare
          urgente.
        </p>
      ) : (
        <ReminderField reminders={form.reminders} onChange={form.setReminders} />
      )}
    </div>
  );
}
