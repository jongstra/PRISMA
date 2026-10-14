import { describe, it, expect } from 'vitest';
import { scoreName } from '../scoreName';

const metrics = (visibility: boolean, implementation: boolean, effectiveness: boolean) => ({
  visibility,
  implementation,
  effectiveness,
});

describe('scoreName', () => {
  it('calls all three scores together the weight', () => {
    expect(scoreName(metrics(true, true, true))).toEqual({
      short: 'weight',
      long: 'weight: visibility × implementation × effectiveness',
    });
  });

  it('names a single score', () => {
    expect(scoreName(metrics(false, true, false))).toEqual({ short: 'implementation', long: 'implementation' });
  });

  it('shortens two scores to their initials, so they fit on the button', () => {
    expect(scoreName(metrics(true, false, true))).toEqual({ short: 'V × E', long: 'visibility × effectiveness' });
  });

  it('says when no score is ticked', () => {
    expect(scoreName(metrics(false, false, false)).short).toBe('no score');
  });
});
