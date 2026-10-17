// Width of a horizontal bar in the insight charts, as a share of its track (the grey line below the row's name).
// `max` is the value that fills the track: the largest value in the chart for counts, or 100 for percentages.
export function barWidth(value: number, max: number): string {
  const fraction = max > 0 ? Math.min(Math.max((Number(value) || 0) / max, 0), 1) : 0;
  return `${fraction * 100}%`;
}
