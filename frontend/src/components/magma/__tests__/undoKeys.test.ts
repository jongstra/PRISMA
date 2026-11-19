import { describe, it, expect } from 'vitest';
import { fieldHasOwnUndo, shortcuts, undoKey } from '../undoKeys';

const key = (key: string, modifiers: Partial<KeyboardEventInit> = {}) =>
  new KeyboardEvent('keydown', { key, ...modifiers });

describe('undoKey', () => {
  it('knows undo and redo with Ctrl (Windows, Linux) and ⌘ (Mac)', () => {
    expect(undoKey(key('z', { ctrlKey: true }))).toBe('undo');
    expect(undoKey(key('z', { metaKey: true }))).toBe('undo');
    expect(undoKey(key('Z', { ctrlKey: true, shiftKey: true }))).toBe('redo');
    expect(undoKey(key('z', { metaKey: true, shiftKey: true }))).toBe('redo');
    expect(undoKey(key('y', { ctrlKey: true }))).toBe('redo');
  });

  it('ignores other keys, and z without Ctrl or ⌘', () => {
    expect(undoKey(key('z'))).toBeNull();
    expect(undoKey(key('x', { ctrlKey: true }))).toBeNull();
    expect(undoKey(key('z', { ctrlKey: true, altKey: true }))).toBeNull();
  });
});

describe('shortcuts', () => {
  it('names the keys as the computer does', () => {
    expect(shortcuts(true)).toEqual({ undo: '⌘Z', redo: '⇧⌘Z' });
    expect(shortcuts(false)).toEqual({ undo: 'Ctrl+Z', redo: 'Ctrl+Shift+Z' });
  });
});

describe('fieldHasOwnUndo', () => {
  it('leaves undo to a field outside the sheets, to a search field and to an ID field (renamed when it is left)', () => {
    document.body.innerHTML = `
      <input id="outside">
      <table class="fixed-table"><tbody><tr>
        <td><textarea id="name"></textarea></td>
        <td><textarea id="id" data-field="id"></textarea></td>
        <td><div class="option-picker"><input id="search"></div></td>
        <td><button id="button">x</button></td>
      </tr></tbody></table>`;
    const own = (id: string) => fieldHasOwnUndo(document.getElementById(id));
    expect(own('outside')).toBe(true);
    expect(own('search')).toBe(true);
    expect(own('id')).toBe(true);
    expect(own('name')).toBe(false);
    expect(own('button')).toBe(false);
    expect(fieldHasOwnUndo(document.body)).toBe(false);
  });
});
