import { describe, expect, it } from 'vitest';
import { feedbackKind } from './categoryFeedback';

describe('feedbackKind', () => {
  it('scegliere altro rispetto alla proposta è una correzione', () => {
    expect(feedbackKind({ finalId: 'sport', proposedId: 'altro', suggestedLabel: null })).toEqual({
      corrected: true,
    });
  });
  it('accettare un suggerimento vero è una conferma', () => {
    expect(feedbackKind({ finalId: 'visita', proposedId: 'visita', suggestedLabel: 'visita' })).toEqual({
      corrected: false,
    });
  });
  it('accettare «altro» o nessun suggerimento non insegna nulla', () => {
    expect(feedbackKind({ finalId: 'altro', proposedId: 'altro', suggestedLabel: 'altro' })).toBeNull();
    expect(feedbackKind({ finalId: 'altro', proposedId: 'altro', suggestedLabel: undefined })).toBeNull();
  });
});
