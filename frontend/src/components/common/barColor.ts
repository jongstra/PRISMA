// The colours of the chart bars: a scale for percentages, and fixed colours for the three MaGMa scores and for counts,
// the same as on the Insights page (FireBrick and Olive in the occurrence charts, SteelBlue in the tactics chart).

/** The colour for a percentage: from red (0%) through olive (50%) to green (100%). For a risk, pass 100 minus it. */
export function barColor(percentage: number): string {
  const fraction = Math.min(Math.max(percentage / 100, 0), 1);
  return `rgb(${255 - 255 * fraction}, ${255 * fraction}, 0)`;
}

/** The colour of each MaGMa score, the same in every chart and legend. */
export const SCORE_COLORS = {
  visibility: 'FireBrick',
  implementation: 'Olive',
  effectiveness: 'SteelBlue',
} as const;

/** The colour of a bar that counts something, such as use cases per data source. */
export const COUNT_COLOR = 'SteelBlue';

/** The two parts of a bar that counts techniques: the techniques themselves and their sub-techniques. */
export const TECHNIQUE_COLORS = { techniques: COUNT_COLOR, subtechniques: '#89AFCF' } as const;

/** The two parts of a bar that counts how often a technique is used: by groups and by software. */
export const OCCURRENCE_COLORS = { groups: 'FireBrick', software: 'Olive' } as const;

/** The legends of those two kinds of bars (see ChartLegend). */
export const TECHNIQUE_LEGEND = [
  { label: 'Techniques', color: TECHNIQUE_COLORS.techniques },
  { label: 'Sub-techniques', color: TECHNIQUE_COLORS.subtechniques },
];
export const OCCURRENCE_LEGEND = [
  { label: 'Groups', color: OCCURRENCE_COLORS.groups },
  { label: 'Software', color: OCCURRENCE_COLORS.software },
];
