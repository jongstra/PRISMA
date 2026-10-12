// Colour of a horizontal bar in the charts, for a percentage: from red (0%) through olive (50%) to green (100%). For a
// value where high is bad, such as a risk, pass 100 minus the value.
export function barColor(percentage: number): string {
  const fraction = Math.min(Math.max(percentage / 100, 0), 1);
  return `rgb(${255 - 255 * fraction}, ${255 * fraction}, 0)`;
}
