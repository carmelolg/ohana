import { supabase } from '../supabase';
import type {
  DocumentRow,
  EmergencyInfo,
  FollowUp,
  Maintenance,
  MaintenanceLog,
  Procedure,
  VisitNote,
} from '../types';
import { useAuthedQuery } from './query';

export const useMaintenances = () =>
  useAuthedQuery<Maintenance[]>(['maintenances'], () =>
    supabase
      .from('maintenances')
      // la scadenza generata, non gli impegni collegati a mano (anche questi puntano alla manutenzione)
      .select('*, events!events_maintenance_fk(id, starts_at, status)')
      .order('created_at'),
  );

/** Impegno collegato a una pratica o a una manutenzione, quanto basta per la sua linea del tempo. */
export interface LinkedEvent {
  id: string;
  title: string;
  starts_at: string;
  status: 'open' | 'done';
}

/** Impegni che l'utente ha collegato a una pratica (`procedure`) o a una manutenzione (`maintenance`). */
export const useLinkedEvents = (kind: 'procedure' | 'maintenance', id: string | undefined) =>
  useAuthedQuery<LinkedEvent[]>(
    ['events', 'linked', kind, id],
    () =>
      supabase
        .from('events')
        .select('id, title, starts_at, status')
        .eq(kind === 'procedure' ? 'linked_procedure_id' : 'linked_maintenance_id', id!)
        .order('starts_at', { ascending: false }),
    !!id,
  );

/** Registro delle esecuzioni di una manutenzione, dalla più recente. */
export const useMaintenanceLog = (maintenanceId: string | undefined) =>
  useAuthedQuery<MaintenanceLog[]>(
    ['maintenances', 'log', maintenanceId],
    () =>
      supabase
        .from('maintenance_log')
        .select('*')
        .eq('maintenance_id', maintenanceId!)
        .order('done_on', { ascending: false }),
    !!maintenanceId,
  );

export const useProcedures = () =>
  useAuthedQuery<Procedure[]>(['procedures'], () =>
    supabase
      .from('procedures')
      .select('*, procedure_steps(*), procedure_docs(*)')
      .order('created_at', { ascending: false }),
  );

export const useDocuments = () =>
  useAuthedQuery<DocumentRow[]>(['documents'], () =>
    supabase.from('documents').select('*, attachments(path, name)').order('created_at', { ascending: false }),
  );

export const useEmergencyAll = () =>
  useAuthedQuery<EmergencyInfo[]>(['emergency'], () => supabase.from('emergency_info').select('*'));

export const useVisitNotes = (eventId: string | undefined) =>
  useAuthedQuery<VisitNote[]>(
    ['visit', 'notes', eventId],
    () => supabase.from('visit_notes').select('*').eq('event_id', eventId!).order('created_at'),
    !!eventId,
  );

export const useFollowUps = (eventId: string | undefined) =>
  useAuthedQuery<FollowUp[]>(
    ['visit', 'followups', eventId],
    () => supabase.from('follow_ups').select('*').eq('event_id', eventId!).order('created_at'),
    !!eventId,
  );

/** Date degli impegni collegati ai passaggi di una pratica. */
export const useProcedureEvents = (eventIds: string[]) =>
  useAuthedQuery<{ id: string; starts_at: string }[]>(
    ['procedure-events', eventIds.join(',')],
    () => supabase.from('events').select('id, starts_at').in('id', eventIds),
    eventIds.length > 0,
  );

/** File allegati ai documenti richiesti da una pratica. */
export const useAttachmentsByIds = (ids: string[]) =>
  useAuthedQuery<{ id: string; path: string; name: string }[]>(
    ['procedure-atts', ids.join(',')],
    () => supabase.from('attachments').select('id, path, name').in('id', ids),
    ids.length > 0,
  );

export interface VisitHistoryItem {
  id: string;
  title: string;
  starts_at: string;
  status: string;
}

/** Visite passate e future con lo stesso professionista (contatto), dalla più recente. */
export const useVisitHistory = (contactId: string | null) =>
  useAuthedQuery<VisitHistoryItem[]>(
    ['visit', 'history', contactId],
    () =>
      supabase
        .from('events')
        .select('id, title, starts_at, status, categories!inner(slug)')
        .eq('contact_id', contactId!)
        .eq('categories.slug', 'visita')
        .order('starts_at', { ascending: false }),
    !!contactId,
  );

/** Prossima scadenza (evento aperto collegato) di una manutenzione, se c'è. */
export function nextDue(m: { events: { starts_at: string; status: string }[] }): Date | null {
  const open = m.events.filter((e) => e.status === 'open').map((e) => new Date(e.starts_at).getTime());
  return open.length ? new Date(Math.min(...open)) : null;
}
