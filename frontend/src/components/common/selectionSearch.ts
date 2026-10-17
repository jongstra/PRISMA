// The list below the search field of a selection tool (SelectionTool.vue).

/**
 * The items to suggest: those that are not selected yet, with the typed text in their name (ignoring case). While
 * nothing is typed, that is all of them, so the list can be browsed.
 */
export function suggestedItems<T extends { name: string }>(
  items: T[],
  query: string,
  isSelected: (item: T) => boolean,
): T[] {
  const typed = query.trim().toLowerCase();
  return items.filter((item) => !isSelected(item) && item.name.toLowerCase().includes(typed));
}
