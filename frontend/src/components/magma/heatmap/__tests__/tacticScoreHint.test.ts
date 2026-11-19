import { describe, expect, it } from 'vitest';
import { tacticScoreHint } from '../tacticScoreHint';

describe('tacticScoreHint', () => {
  it('names the score, then gives it over all techniques and over those with use cases, in bullets', () => {
    const score = { value: 14.2, techniques: 10, withUseCases: { value: 70, techniques: 2 } };
    expect(tacticScoreHint(score, 'weight', 0)).toBe(
      'Weight:\n\n• 14% over its 10 techniques\n• 70% over the 2 with use cases',
    );
    expect(tacticScoreHint(score, 'implementation × effectiveness', 0)).toBe(
      'Implementation × effectiveness:\n\n• 14% over its 10 techniques\n• 70% over the 2 with use cases',
    );
  });

  it('says so when no technique has use cases, and counts a single technique as one', () => {
    expect(tacticScoreHint({ value: 0, techniques: 3, withUseCases: null }, 'weight', 0)).toBe(
      'Weight:\n\n• 0% over its 3 techniques\n• None has use cases yet',
    );
    const one = { value: 50, techniques: 1, withUseCases: { value: 50, techniques: 1 } };
    expect(tacticScoreHint(one, 'weight', 0)).toBe(
      'Weight:\n\n• 50% over its 1 technique\n• 50% over the 1 with use cases',
    );
  });

  it('mentions the n/a techniques that are left out, on a line of their own', () => {
    expect(tacticScoreHint({ value: 0, techniques: 8, withUseCases: null }, 'weight', 2)).toBe(
      'Weight:\n\n• 0% over its 8 techniques\n• None has use cases yet\n• 2 n/a techniques left out',
    );
    expect(tacticScoreHint({ value: 0, techniques: 8, withUseCases: null }, 'weight', 1)).toMatch(
      /\n• 1 n\/a technique left out$/,
    );
  });

  it('explains n/a', () => {
    expect(tacticScoreHint({ value: null, techniques: 0, withUseCases: null }, 'weight', 4)).toBe(
      'n/a: no data components or use cases for its techniques',
    );
  });
});
