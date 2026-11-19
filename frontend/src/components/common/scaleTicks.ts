// The numbers and hints of a scale legend (ScaleLegend.vue): a bar with a white part for 0% and four colour steps.

/** The numbers under the bar, as a percentage of its width: 0 in the middle of the white part (whiteShare of a step
 * wide), each inner number on the border after its step, and the last at the right edge. */
export function scaleTicks(upTo: number[], whiteShare: number): { label: string; left: number }[] {
  const total = whiteShare + upTo.length;
  return [
    { label: '0', left: (whiteShare / 2 / total) * 100 },
    ...upTo.map((bound, index) => ({
      label: String(bound),
      left: index === upTo.length - 1 ? 100 : ((whiteShare + index + 1) / total) * 100,
    })),
  ];
}

/** The hint of each step: 'Visibility up to 25%', 'Visibility 25 to 50%', and so on. */
export const stepHints = (name: string, upTo: number[]) =>
  upTo.map((bound, index) => (index === 0 ? `${name} up to ${bound}%` : `${name} ${upTo[index - 1]} to ${bound}%`));
