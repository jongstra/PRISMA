// The green of a heatmap score (0-100), in four steps that match the legend: a warm, slightly yellow green, from pale
// (up to 25%) to fresh and bright (above 75%). Clear steps make 50% and 90% look different, and even the highest step
// stays light, so a high score looks positive rather than heavy. The colour is laid over the base colour of a technique
// button or legend swatch (--color-technique), so a score of 0% looks like the base colour.
export const HEATMAP_STEPS = [
  { upTo: 25, colour: '#d6eec8' },
  { upTo: 50, colour: '#b5e19a' },
  { upTo: 75, colour: '#93d36c' },
  { upTo: 100, colour: '#78c847' },
];

export function heatmapFill(score: number): { backgroundImage?: string } {
  if (score <= 0) {
    return {};
  }
  const { colour } = HEATMAP_STEPS.find((step) => score <= step.upTo) ?? HEATMAP_STEPS.at(-1)!;
  return { backgroundImage: `linear-gradient(${colour}, ${colour})` };
}
