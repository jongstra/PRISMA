// The green of a heatmap score (0-100), laid over the base colour of a technique button or legend swatch
// (--color-technique), so that 0% looks like the base colour and 100% is full green.
export function heatmapFill(score: number): { backgroundImage: string } {
  const green = `rgba(0, 255, 0, ${score / 100})`;
  return { backgroundImage: `linear-gradient(${green}, ${green})` };
}
