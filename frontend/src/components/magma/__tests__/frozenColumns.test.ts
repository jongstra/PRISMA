import { describe, expect, it } from 'vitest';
import { frozenLefts, frozenWidth } from '../frozenColumns';

describe('frozenColumns', () => {
  it('sticks the delete column, ID and name next to each other, with the 2px between the cells', () => {
    expect(frozenLefts(28, [86, 155])).toEqual([2, 32, 120]);
  });

  it('covers their widths and the 2px around them', () => {
    expect(frozenWidth(28, [86, 155])).toBe(2 + 28 + 2 + 86 + 2 + 155 + 2);
  });
});
