import { describe, it, expect } from 'vitest';
import {
  barColor,
  COUNT_COLOR,
  OCCURRENCE_COLORS,
  OCCURRENCE_LEGEND,
  SCORE_COLORS,
  TECHNIQUE_COLORS,
  TECHNIQUE_LEGEND,
} from '../barColor';

describe('barColor', () => {
  it('goes from red at 0% through olive at 50% to green at 100%', () => {
    expect(barColor(0)).toBe('rgb(255, 0, 0)');
    expect(barColor(50)).toBe('rgb(127.5, 127.5, 0)');
    expect(barColor(100)).toBe('rgb(0, 255, 0)');
  });

  it('stays red or green outside 0-100%', () => {
    expect(barColor(-10)).toBe('rgb(255, 0, 0)');
    expect(barColor(120)).toBe('rgb(0, 255, 0)');
  });
});

describe('chart colours', () => {
  it('gives the three MaGMa scores and the counts the colours of the Insights page', () => {
    expect(SCORE_COLORS).toEqual({ visibility: 'FireBrick', implementation: 'Olive', effectiveness: 'SteelBlue' });
    expect(COUNT_COLOR).toBe('SteelBlue');
  });

  it('gives the legends the colours of the bar parts they explain', () => {
    expect(TECHNIQUE_LEGEND.map((item) => item.color)).toEqual([
      TECHNIQUE_COLORS.techniques,
      TECHNIQUE_COLORS.subtechniques,
    ]);
    expect(OCCURRENCE_LEGEND.map((item) => item.color)).toEqual([OCCURRENCE_COLORS.groups, OCCURRENCE_COLORS.software]);
  });
});
