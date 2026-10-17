import { describe, it, expect } from 'vitest';
import { potentialHint } from '../potentialSegments';

describe('potentialHint', () => {
  it('gives the three scores behind an improvement potential bar', () => {
    expect(potentialHint({ visibility: 20, implementation: '50.00', effectiveness: 47.5 })).toBe(
      'Visibility 20% · Implementation 50% · Effectiveness 47.5%',
    );
  });

  it('shows a dash for a score that is missing', () => {
    expect(potentialHint({ visibility: null, implementation: 50, effectiveness: undefined })).toBe(
      'Visibility – · Implementation 50% · Effectiveness –',
    );
  });
});
