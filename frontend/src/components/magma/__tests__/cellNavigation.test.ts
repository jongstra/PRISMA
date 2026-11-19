import { describe, it, expect } from 'vitest';
import { keyDirection, nextCell, type FieldState } from '../cellNavigation';

// A sheet of 3 rows and 4 columns where column 2 is calculated, and row 1 column 3 is locked.
const size = { rows: 3, columns: 4 };
const canFocus = (row: number, column: number) => column !== 2 && !(row === 1 && column === 3);

describe('nextCell', () => {
  it('steps up, down, left and right to the next cell that can take the cursor', () => {
    expect(nextCell({ row: 0, column: 1 }, 'down', size, canFocus)).toEqual({ row: 1, column: 1 });
    expect(nextCell({ row: 0, column: 1 }, 'right', size, canFocus)).toEqual({ row: 0, column: 3 }); // over column 2
    expect(nextCell({ row: 0, column: 3 }, 'down', size, canFocus)).toEqual({ row: 2, column: 3 }); // over the locked cell
    expect(nextCell({ row: 2, column: 3 }, 'left', size, canFocus)).toEqual({ row: 2, column: 1 });
  });

  it('stops at the edges of the sheet', () => {
    expect(nextCell({ row: 0, column: 0 }, 'up', size, canFocus)).toBeNull();
    expect(nextCell({ row: 0, column: 0 }, 'left', size, canFocus)).toBeNull();
    expect(nextCell({ row: 2, column: 3 }, 'right', size, canFocus)).toBeNull();
  });

  it('goes on to the next or previous row with Tab and Shift+Tab', () => {
    expect(nextCell({ row: 0, column: 3 }, 'next', size, canFocus)).toEqual({ row: 1, column: 0 });
    expect(nextCell({ row: 1, column: 1 }, 'next', size, canFocus)).toEqual({ row: 2, column: 0 }); // over 2 and 3
    expect(nextCell({ row: 1, column: 0 }, 'previous', size, canFocus)).toEqual({ row: 0, column: 3 });
    expect(nextCell({ row: 2, column: 3 }, 'next', size, canFocus)).toBeNull();
  });
});

describe('keyDirection', () => {
  const key = (key: string, modifiers: Partial<KeyboardEventInit> = {}) =>
    new KeyboardEvent('keydown', { key, ...modifiers });
  const text = (start: number, end: number, length = 5, multiline = false): FieldState => ({
    kind: multiline ? 'multiline' : 'text',
    start,
    end,
    length,
  });
  const other: FieldState = { kind: 'other', start: 0, end: 0, length: 0 };

  it('moves with Tab, Shift+Tab, and up and down in a text of one line', () => {
    expect(keyDirection(key('Tab'), text(2, 2))).toBe('next');
    expect(keyDirection(key('Tab', { shiftKey: true }), text(2, 2))).toBe('previous');
    expect(keyDirection(key('ArrowUp'), text(2, 2))).toBe('up');
    expect(keyDirection(key('ArrowDown'), text(2, 2))).toBe('down');
  });

  it('moves left or right only from the start or end of the text, or when all of it is selected', () => {
    expect(keyDirection(key('ArrowLeft'), text(2, 2))).toBeNull();
    expect(keyDirection(key('ArrowLeft'), text(0, 0))).toBe('left');
    expect(keyDirection(key('ArrowRight'), text(5, 5))).toBe('right');
    expect(keyDirection(key('ArrowRight'), text(0, 5))).toBe('right');
    expect(keyDirection(key('ArrowRight'), text(0, 2))).toBeNull();
  });

  it('moves down with Enter (up with Shift+Enter), but Enter in the description adds a line', () => {
    expect(keyDirection(key('Enter'), text(2, 2))).toBe('down');
    expect(keyDirection(key('Enter', { shiftKey: true }), text(2, 2))).toBe('up');
    expect(keyDirection(key('Enter'), text(2, 2, 5, true))).toBeNull();
  });

  it('leaves the description up or down only from its first or last character', () => {
    expect(keyDirection(key('ArrowUp'), text(3, 3, 9, true))).toBeNull();
    expect(keyDirection(key('ArrowUp'), text(0, 0, 9, true))).toBe('up');
    expect(keyDirection(key('ArrowDown'), text(9, 9, 9, true))).toBe('down');
  });

  it('moves from a search field or switch with every arrow; Enter opens or switches it', () => {
    expect(keyDirection(key('ArrowDown'), other)).toBe('down');
    expect(keyDirection(key('ArrowLeft'), other)).toBe('left');
    expect(keyDirection(key('Enter'), other)).toBeNull();
  });

  it('leaves keys with Ctrl, ⌘, Alt or (for arrows) Shift to the browser', () => {
    expect(keyDirection(key('ArrowDown', { shiftKey: true }), text(2, 2))).toBeNull();
    expect(keyDirection(key('ArrowDown', { altKey: true }), other)).toBeNull();
    expect(keyDirection(key('ArrowRight', { metaKey: true }), text(5, 5))).toBeNull();
    expect(keyDirection(key('Enter', { ctrlKey: true }), text(2, 2))).toBeNull();
  });
});
