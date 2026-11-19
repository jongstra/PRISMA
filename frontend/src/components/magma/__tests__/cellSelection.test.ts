import { describe, it, expect } from 'vitest';
import { blockFields, blockRowUids, blockSize, inBlock, selectionBlock } from '../cellSelection';

const rows = ['a', 'b', 'c', 'd'];
const fields = ['name', 'implementation', 'effectiveness'];

describe('selectionBlock', () => {
  it('is the block from the anchor to the focus, in the order of the sheet, whichever way it was dragged', () => {
    const down = { anchor: { uid: 'b', field: 'implementation' }, focus: { uid: 'd', field: 'effectiveness' } };
    const up = { anchor: down.focus, focus: down.anchor };
    expect(selectionBlock(down, rows, fields)).toEqual({ rows: [1, 3], columns: [1, 2] });
    expect(selectionBlock(up, rows, fields)).toEqual({ rows: [1, 3], columns: [1, 2] });
  });

  it('is null without a selection, or when a cell of it is no longer in the sheet', () => {
    expect(selectionBlock(null, rows, fields)).toBeNull();
    const gone = { anchor: { uid: 'x', field: 'name' }, focus: { uid: 'a', field: 'name' } };
    expect(selectionBlock(gone, rows, fields)).toBeNull();
    const id = { anchor: { uid: 'a', field: 'id' }, focus: { uid: 'b', field: 'name' } }; // not a selectable column
    expect(selectionBlock(id, rows, fields)).toBeNull();
  });
});

describe('a block', () => {
  const block = { rows: [1, 3] as [number, number], columns: [1, 1] as [number, number] };

  it('knows its size, its cells, its rows and its columns', () => {
    expect(blockSize(block)).toBe(3);
    expect(inBlock(block, 2, 1)).toBe(true);
    expect(inBlock(block, 2, 2)).toBe(false);
    expect(inBlock(block, 0, 1)).toBe(false);
    expect(blockRowUids(block, rows)).toEqual(['b', 'c', 'd']);
    expect(blockFields(block, fields)).toEqual([fields[1]]);
    expect(blockFields({ ...block, columns: [0, 2] }, fields)).toEqual(fields.slice(0, 3));
  });
});
