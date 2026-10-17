import { describe, it, expect } from 'vitest';
import { splitHint } from '../splitHint';

describe('splitHint', () => {
  it('names the count of each part of a bar', () => {
    expect(
      splitHint([
        [77, 'technique', 'techniques'],
        [220, 'sub-technique', 'sub-techniques'],
      ]),
    ).toBe('77 techniques + 220 sub-techniques');
  });

  it('uses the singular for one, and the plural for zero', () => {
    expect(
      splitHint([
        [1, 'group', 'groups'],
        [0, 'software', 'software'],
      ]),
    ).toBe('1 group + 0 software');
  });
});
