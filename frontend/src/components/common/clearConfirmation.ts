// The question before all selected groups or components are cleared (SelectionTool.vue). It only gives their number: the
// items themselves are in view, in the box with the clear icon. A single item clears at once, as clicking its chip does.

/** The question for clearing this many items, such as 'Clear all 4 groups?', or null when it needs no question. */
export function clearConfirmation(count: number, noun: string): string | null {
  if (count < 2) {
    return null;
  }
  return count === 2 ? `Clear both ${noun}s?` : `Clear all ${count} ${noun}s?`;
}
