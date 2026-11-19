import { describe, it, expect } from 'vitest';
import { scaleTicks, stepHints } from '../scaleTicks';

describe('scaleTicks', () => {
  it('puts 0 in the middle of the white part, the inner numbers on the borders and 100 at the right edge', () => {
    // A white part of 0.6 step and four steps: 4.6 steps in all.
    expect(scaleTicks([25, 50, 75, 100], 0.6)).toEqual([
      { label: '0', left: (0.3 / 4.6) * 100 },
      { label: '25', left: (1.6 / 4.6) * 100 },
      { label: '50', left: (2.6 / 4.6) * 100 },
      { label: '75', left: (3.6 / 4.6) * 100 },
      { label: '100', left: 100 },
    ]);
  });
});

describe('stepHints', () => {
  it('names each step by its range, with the name of what is measured', () => {
    expect(stepHints('Visibility', [25, 50, 75, 100])).toEqual([
      'Visibility up to 25%',
      'Visibility 25 to 50%',
      'Visibility 50 to 75%',
      'Visibility 75 to 100%',
    ]);
  });
});
