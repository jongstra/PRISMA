import { describe, it, expect } from 'vitest';
import { ancestorCounts, heatmapValue, tacticScore } from '../heatmap';

const DOMAIN = 'enterprise-attack';
const l3 = (id: string, parentIds: string[], visibility: number, implementation: number, effectiveness: number) => ({
  domain: DOMAIN,
  level: 3,
  id,
  parentIds,
  visibility,
  implementation,
  effectiveness,
});
const all = { visibility: true, implementation: true, effectiveness: true };
const none = { visibility: false, implementation: false, effectiveness: false };

describe('heatmapValue', () => {
  const useCases = [l3('A', [], 50, 80, 100), l3('B', [], 100, 40, 50)];

  it('averages the product of the selected metrics over the use cases', () => {
    expect(heatmapValue(useCases, all)).toBeCloseTo((40 + 20) / 2); // The average weight.
    expect(heatmapValue(useCases, { ...none, visibility: true })).toBeCloseTo(75);
    expect(heatmapValue(useCases, { ...none, implementation: true, effectiveness: true })).toBeCloseTo((80 + 20) / 2);
  });

  it('supports visibility + effectiveness, which was missing (it showed visibility only)', () => {
    expect(heatmapValue(useCases, { ...none, visibility: true, effectiveness: true })).toBeCloseTo((50 + 50) / 2);
  });

  it('returns null without use cases or without a selected metric', () => {
    expect(heatmapValue([], all)).toBeNull();
    expect(heatmapValue(useCases, none)).toBeNull();
  });
});

describe('ancestorCounts', () => {
  it('counts distinct L2 and L1 use cases above the L3 use cases', () => {
    const allUseCases = [
      { domain: DOMAIN, level: 1, id: 'DOS' },
      { domain: DOMAIN, level: 1, id: 'FIN' },
      { domain: DOMAIN, level: 2, id: 'DOS-1', parentIds: ['DOS'] },
      { domain: DOMAIN, level: 2, id: 'DOS-2', parentIds: ['DOS', 'FIN'] },
      l3('A', ['DOS-1'], 0, 0, 0),
      l3('B', ['DOS-1', 'DOS-2'], 0, 0, 0),
      l3('C', ['DOS-2'], 0, 0, 0),
      { domain: 'mobile-attack', level: 2, id: 'DOS-1', parentIds: ['X'] },
    ];
    expect(
      ancestorCounts(
        allUseCases.filter((u) => u.level === 3),
        allUseCases,
      ),
    ).toEqual({ l2: 2, l1: 2 });
    expect(ancestorCounts([allUseCases[4]], allUseCases)).toEqual({ l2: 1, l1: 1 });
  });

  it('leaves out a parent on the wrong level, as the scores do', () => {
    const allUseCases = [{ domain: DOMAIN, level: 1, id: 'DOS' }];
    expect(ancestorCounts([l3('A', ['DOS'], 0, 0, 0)], allUseCases)).toEqual({ l2: 0, l1: 0 });
  });
});

describe('tacticScore', () => {
  // A technique with use cases of these weights (visibility and implementation 100%, so the weight is the effectiveness).
  const covered = (...weights: number[]) => ({
    useCases: weights.map((weight, index) => l3(`UC-${index}`, [], 100, 100, weight)),
    detectable: true,
  });
  const uncovered = { useCases: [], detectable: true };
  const striped = { useCases: [], detectable: false }; // no use cases, and ATT&CK lists no data components for it

  it('averages over all techniques, those without use cases as 0%, and also over those with use cases alone', () => {
    const techniques = [covered(60), covered(80), ...Array(8).fill(uncovered)];
    expect(tacticScore(techniques, all)).toEqual({
      value: 14,
      techniques: 10,
      withUseCases: { value: 70, techniques: 2 },
    });
  });

  it('leaves out the striped techniques, as the DeTT&CT tactic visibility does, but not one that has use cases', () => {
    expect(tacticScore([striped, uncovered, covered(50)], all)).toMatchObject({ value: 25, techniques: 2 });
    expect(tacticScore([{ ...covered(40), detectable: false }], all)).toMatchObject({ value: 40, techniques: 1 });
  });

  it('uses the selected metrics, as the techniques do', () => {
    const technique = { useCases: [l3('UC', [], 50, 80, 100)], detectable: true };
    expect(tacticScore([technique, uncovered], { ...none, visibility: true })).toMatchObject({ value: 25 });
  });

  it('is 0 without use cases, n/a (null) when every technique is striped, and absent without a selected metric', () => {
    expect(tacticScore([uncovered, uncovered], all)).toEqual({ value: 0, techniques: 2, withUseCases: null });
    expect(tacticScore([striped, striped], all)).toEqual({ value: null, techniques: 0, withUseCases: null });
    expect(tacticScore([covered(50)], none)).toBeNull();
  });
});
