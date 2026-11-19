// The colour of a technique's visibility, as in the DeTT&CT matrix, its legend and the chips in a technique's tooltip:
// four steps of a warm rose-purple that match the legend (up to 25, 50, 75 and 100%), like the green steps of the MaGMa
// heatmap (heatmapFill.ts). Even the darkest step stays light, so all text is black. A visibility of 0% has no colour.
export const VISIBILITY_STEPS = [
  { upTo: 25, colour: '#f1cee5' },
  { upTo: 50, colour: '#e5a6cf' },
  { upTo: 75, colour: '#d97db9' },
  { upTo: 100, colour: '#cf5da7' },
];

export function visibilityColour(ratio: number): { backgroundColor: string; color: string } {
  if (ratio <= 0) {
    return { backgroundColor: '', color: 'black' };
  }
  const step = VISIBILITY_STEPS.find((candidate) => ratio * 100 <= candidate.upTo) ?? VISIBILITY_STEPS.at(-1)!;
  return { backgroundColor: step.colour, color: 'black' };
}
