import { describe, expect, it } from 'vitest';
import { assignableRoles, canEditMember, leaveDialog, removalError } from './memberRules';

describe('regole sulle persone di uno spazio', () => {
  it('chi può cambiare il ruolo di chi', () => {
    expect(canEditMember('owner', 'owner')).toBe(true);
    expect(canEditMember('admin', 'member')).toBe(true);
    expect(canEditMember('admin', 'admin')).toBe(false);
    expect(canEditMember('member', 'viewer')).toBe(false);
    expect(canEditMember(undefined, 'viewer')).toBe(false);
  });
  it('ruoli assegnabili', () => {
    expect(assignableRoles('owner')).toContain('owner');
    expect(assignableRoles('admin')).toEqual(['member', 'viewer']);
  });
  it('testi della conferma', () => {
    expect(leaveDialog(true).confirmLabel).toBe('Esci');
    expect(leaveDialog(false).confirmLabel).toBe('Rimuovi');
  });
  it('unico proprietario → messaggio comprensibile', () => {
    expect(removalError('violates ultimo owner rule')).toMatch(/unico proprietario/);
    expect(removalError('boom')).toBe('boom');
  });
});
