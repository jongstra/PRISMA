// The colour of a technique's visibility, as in the DeTT&CT matrix and its legend: from no colour (up to 1%) through
// five shades of purple, with white text on the three darkest. Used by the matrix buttons and the chips in their tooltip.
export function visibilityColour(ratio: number): { backgroundColor: string; color: string } {
  if (ratio <= 0.01) return { backgroundColor: '', color: 'black' };
  if (ratio <= 0.25) return { backgroundColor: '#E1BEE7', color: 'black' };
  if (ratio <= 0.5) return { backgroundColor: '#CE93D8', color: 'black' };
  if (ratio <= 0.75) return { backgroundColor: '#AB47BC', color: 'white' };
  if (ratio <= 0.99) return { backgroundColor: '#7B1FA2', color: 'white' };
  return { backgroundColor: '#4A148C', color: 'white' };
}
