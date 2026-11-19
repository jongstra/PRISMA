// A block of selected cells in a sheet, from the cell where the selection started (the anchor) to the cell where it ends
// (the focus), as in a spreadsheet. Cells are named by their use case (uid) and column (field), so a selection stays on
// the same cells when the use cases change; the block is taken in the order the sheet shows them.

export interface Cell {
  uid: string;
  field: string;
}

export interface CellSelection {
  anchor: Cell;
  focus: Cell;
}

/** The block as ranges of row and column positions in the sheet (first and last, inclusive). */
export interface Block {
  rows: [number, number];
  columns: [number, number];
}

const range = (a: number, b: number): [number, number] => [Math.min(a, b), Math.max(a, b)];

/** The block of a selection, or null when its cells are not in the sheet (any more). */
export function selectionBlock(selection: CellSelection | null, rowUids: string[], fields: string[]): Block | null {
  if (!selection) {
    return null;
  }
  const at = (cell: Cell) => [rowUids.indexOf(cell.uid), fields.indexOf(cell.field)] as const;
  const [anchorRow, anchorColumn] = at(selection.anchor);
  const [focusRow, focusColumn] = at(selection.focus);
  if (anchorRow < 0 || anchorColumn < 0 || focusRow < 0 || focusColumn < 0) {
    return null;
  }
  return { rows: range(anchorRow, focusRow), columns: range(anchorColumn, focusColumn) };
}

export const blockSize = (block: Block) =>
  (block.rows[1] - block.rows[0] + 1) * (block.columns[1] - block.columns[0] + 1);

export const inBlock = (block: Block, row: number, column: number) =>
  row >= block.rows[0] && row <= block.rows[1] && column >= block.columns[0] && column <= block.columns[1];

/** The uids of the rows in the block, in the order of the sheet. */
export const blockRowUids = (block: Block, rowUids: string[]) => rowUids.slice(block.rows[0], block.rows[1] + 1);

/** The fields of the columns in the block, in the order of the sheet. */
export const blockFields = (block: Block, fields: string[]) => fields.slice(block.columns[0], block.columns[1] + 1);
