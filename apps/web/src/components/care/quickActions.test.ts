import { describe, expect, it } from 'vitest';
import type { CareThread } from '../../lib/types';
import { quickActions } from './quickActions';

const thread = (over: Partial<CareThread>): CareThread => ({
  id: 't',
  space_id: 's',
  recipient_id: 'r',
  title: 'Filone',
  specialty: null,
  doctor: null,
  contact_id: null,
  color_hue: 20,
  started_at: null,
  status: 'attivo',
  tracked_params: [],
  created_at: '',
  ...over,
});

describe('registra ora', () => {
  it('un pulsante per ogni parametro monitorato e un episodio per filone', () => {
    const actions = quickActions([
      thread({ id: 'cardio', title: 'Tachicardia', tracked_params: ['heart_rate', 'blood_pressure'] }),
      thread({
        id: 'crohn',
        title: 'Morbo di Crohn',
        tracked_params: ['stools_per_day', 'weight', 'heart_rate'],
      }),
    ]);
    expect(actions.map((a) => a.id)).toEqual([
      'misura:heart_rate',
      'misura:blood_pressure',
      'misura:stools_per_day',
      'misura:weight',
      'episodio:cardio',
      'episodio:crohn',
    ]);
    expect(actions[0]).toMatchObject({ kind: 'measure', threadId: 'cardio' });
    expect(actions[2]).toMatchObject({ kind: 'measure', threadId: 'crohn' });
  });

  it('i filoni chiusi non contano; senza parametri monitorati si propongono tutti', () => {
    const actions = quickActions([
      thread({ id: 'a', status: 'chiuso', tracked_params: ['weight'] }),
      thread({ id: 'b' }),
    ]);
    expect(actions.filter((a) => a.kind === 'measure')).toHaveLength(4);
    expect(actions.filter((a) => a.kind === 'episode').map((a) => a.id)).toEqual(['episodio:b']);
  });

  it('un parametro senza filone che lo monitora non è legato a nessun filone', () => {
    const actions = quickActions([thread({ id: 'a' })]);
    expect(actions[0]).toMatchObject({ kind: 'measure', threadId: null });
  });
});
