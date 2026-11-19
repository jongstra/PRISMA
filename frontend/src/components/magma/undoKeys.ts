// The keys for undo and redo on the MaGMa page, and the fields that keep their own undo.

/** Undo: Ctrl+Z (⌘Z on a Mac). Redo: Ctrl+Shift+Z (⇧⌘Z) or Ctrl+Y. */
export function undoKey(event: KeyboardEvent): 'undo' | 'redo' | null {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return null;
  }
  const key = event.key.toLowerCase();
  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo';
  }
  return key === 'y' && !event.shiftKey ? 'redo' : null;
}

export const isMac = () => /Mac|iPhone|iPad/.test(navigator.userAgent);

/** The keys as they are named on the computer, for the hints. */
export const shortcuts = (mac: boolean) =>
  mac ? { undo: '⌘Z', redo: '⇧⌘Z' } : { undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z' };

/**
 * Whether Ctrl+Z belongs to the field itself (the browser undoes the typing): a field outside the sheets, the search field
 * of a parent or technique, and an ID field while an ID is typed in it (the ID is only renamed when the field is left, so
 * its typing is not a step; once it is renamed, Ctrl+Z undoes the rename). An ID field has its saved ID in data-saved.
 */
export function fieldHasOwnUndo(element: Element | null): boolean {
  if (!(element instanceof HTMLElement) || !element.matches('input, textarea, [contenteditable]')) {
    return false;
  }
  if (element.dataset.field === 'id') {
    return (element as HTMLTextAreaElement).value !== element.dataset.saved;
  }
  return !element.closest('.fixed-table') || !!element.closest('.option-picker');
}
