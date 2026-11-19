import { describe, it, expect } from 'vitest';
import { letteredIds, lettersAfter } from '../letteredIds';

describe('letteredIds', () => {
  it('gives the base with A, B, C… when the base has no lettered IDs yet', () => {
    expect(letteredIds('DOS-1', 3, ['DOS', 'DOS-1', 'FIN-1-A'])).toEqual(['DOS-1-A', 'DOS-1-B', 'DOS-1-C']);
  });

  it('continues after the last letter in use, so a deleted ID (here THR-1-B) is not reused', () => {
    expect(letteredIds('THR-1', 2, ['THR-1-A', 'THR-1-D', 'THR-1-C'])).toEqual(['THR-1-E', 'THR-1-F']);
  });

  it('only counts the letters of the same base', () => {
    expect(letteredIds('THR-1', 1, ['THR-10-F', 'THR-1-A-B', 'XTHR-1-C', 'THR-1-b', 'THR-1-2'])).toEqual(['THR-1-A']);
  });

  it('takes the base as it is, also with characters that have a meaning in a search pattern', () => {
    expect(letteredIds('T1.1', 1, ['T1x1-A'])).toEqual(['T1.1-A']);
  });
});

describe('lettersAfter', () => {
  it('goes from Y to ZA … ZY, then ZZA, so the IDs sort in the order they were made', () => {
    expect(lettersAfter('W', 5)).toEqual(['X', 'Y', 'ZA', 'ZB', 'ZC']);
    expect(lettersAfter('ZX', 3)).toEqual(['ZY', 'ZZA', 'ZZB']);
    const series = lettersAfter('', 80);
    expect(series).toHaveLength(80);
    expect([...series].sort()).toEqual(series);
  });

  it('continues after letters typed by hand outside the series', () => {
    expect(lettersAfter('Z', 1)).toEqual(['ZA']);
    expect(lettersAfter('AA', 1)).toEqual(['B']);
  });
});
