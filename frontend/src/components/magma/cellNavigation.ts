// Moving the cursor between the cells of a sheet with the keyboard, as in a spreadsheet: the arrows, Enter (down) and
// Shift+Enter (up), Tab (right, then on to the next row) and Shift+Tab. In a text, the arrows move within the text and
// step to the next cell at its edge; cells that cannot take the cursor (calculated or locked) are passed over.
// Shift+arrows grow the selection of cells where a plain arrow would step to another cell (see growDirection).

export type Direction = 'up' | 'down' | 'left' | 'right' | 'next' | 'previous';

/** A field as far as the keys are concerned: its kind, where its selected text starts and ends, and its length. */
export interface FieldState {
  kind: 'text' | 'multiline' | 'other'; // a text of one line or a percentage, the description, or a search field/switch
  start: number;
  end: number;
  length: number;
}

/** Where a key moves the cursor from a field, or null when the field keeps the key (to move within its text, say). */
export function keyDirection(event: KeyboardEvent, field: FieldState): Direction | null {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return null;
  }
  if (event.key === 'Tab') {
    return event.shiftKey ? 'previous' : 'next';
  }
  if (event.key === 'Enter') {
    // Enter opens a search field and adds a line in the description.
    return field.kind === 'text' ? (event.shiftKey ? 'up' : 'down') : null;
  }
  return event.shiftKey ? null : arrowDirection(event.key, field); // Shift+arrows: see growDirection
}

/** The direction in which Shift+arrow grows the selection of cells, or null when it selects text in the field. */
export function growDirection(event: KeyboardEvent, field: FieldState): Arrow | null {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) {
    return null;
  }
  return arrowDirection(event.key, field);
}

type Arrow = 'up' | 'down' | 'left' | 'right';

// An arrow leaves a search field or switch always, a text of one line up and down, and a text left or right (the
// description also up or down) only from its edge or when all of it is selected.
function arrowDirection(key: string, field: FieldState): Arrow | null {
  const other = field.kind === 'other';
  const all = field.start === 0 && field.end === field.length; // all text selected (or none there)
  const atStart = all || (field.start === 0 && field.end === 0);
  const atEnd = all || (field.start === field.length && field.end === field.length);
  switch (key) {
    case 'ArrowUp':
      return other || field.kind === 'text' || atStart ? 'up' : null;
    case 'ArrowDown':
      return other || field.kind === 'text' || atEnd ? 'down' : null;
    case 'ArrowLeft':
      return other || atStart ? 'left' : null;
    case 'ArrowRight':
      return other || atEnd ? 'right' : null;
    default:
      return null;
  }
}

/** The next cell in a direction that can take the cursor, or null at the edge of the sheet. */
export function nextCell(
  from: { row: number; column: number },
  direction: Direction,
  size: { rows: number; columns: number },
  canFocus: (row: number, column: number) => boolean,
): { row: number; column: number } | null {
  let { row, column } = from;
  for (;;) {
    if (direction === 'up') {
      row -= 1;
    } else if (direction === 'down') {
      row += 1;
    } else if (direction === 'left') {
      column -= 1;
    } else if (direction === 'right') {
      column += 1;
    } else if (direction === 'next') {
      column += 1;
      if (column >= size.columns) {
        column = 0;
        row += 1;
      }
    } else {
      column -= 1;
      if (column < 0) {
        column = size.columns - 1;
        row -= 1;
      }
    }
    if (row < 0 || row >= size.rows || column < 0 || column >= size.columns) {
      return null;
    }
    if (canFocus(row, column)) {
      return { row, column };
    }
  }
}
