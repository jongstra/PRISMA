import { describe, it, expect } from 'vitest';
import { hasTechnique, linkedTechniqueCounts } from '../techniques';

describe('linkedTechniqueCounts', () => {
  it('counts the rules per technique, the most first, with sub-techniques on their own', () => {
    expect(
      linkedTechniqueCounts([
        { attackTechniqueId: 'T1566.001' },
        { attackTechniqueId: 'T1001' },
        { attackTechniqueId: 'T1566' },
        { attackTechniqueId: 'T1001' },
      ]),
    ).toEqual([
      { techniqueId: 'T1001', count: 2 },
      { techniqueId: 'T1566.001', count: 1 },
      { techniqueId: 'T1566', count: 1 },
    ]);
  });

  it('leaves out rules without a technique', () => {
    expect(linkedTechniqueCounts([{ attackTechniqueId: 'none' }, { attackTechniqueId: '' }, {}])).toEqual([]);
  });
});

describe('hasTechnique', () => {
  it("is false for 'none' and an empty or missing technique", () => {
    expect([hasTechnique('T1001'), hasTechnique('none'), hasTechnique(''), hasTechnique(undefined)]).toEqual([
      true,
      false,
      false,
      false,
    ]);
  });
});
