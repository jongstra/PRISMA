import { describe, it, expect } from 'vitest';
import { parseCopiedCells } from '../copiedCells';

describe('parseCopiedCells', () => {
  it('reads rows and cells as a spreadsheet copies them: a tab between cells, a line break after each row', () => {
    expect(parseCopiedCells('a\tb\r\nc\td\r\n')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(parseCopiedCells('a\tb\nc\td')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps empty cells, also at the end of a row', () => {
    expect(parseCopiedCells('a\t\tc\t\n\tb\n')).toEqual([
      ['a', '', 'c', ''],
      ['', 'b'],
    ]);
  });

  it('reads a cell in quotes, with a line break, a tab or doubled quotes inside', () => {
    expect(parseCopiedCells('"two\nlines"\tx\n"say ""hi"""\t"a\tb"\n')).toEqual([
      ['two\nlines', 'x'],
      ['say "hi"', 'a\tb'],
    ]);
  });

  it('keeps quotes that do not wrap the whole cell', () => {
    expect(parseCopiedCells('"quoted" text\tx\nsize 5"\n')).toEqual([['"quoted" text', 'x'], ['size 5"']]);
  });

  it('reads one value, and nothing', () => {
    expect(parseCopiedCells('T1566')).toEqual([['T1566']]);
    expect(parseCopiedCells('')).toEqual([]);
  });
});
