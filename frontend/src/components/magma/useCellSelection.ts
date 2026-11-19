// Selecting a block of cells in a sheet with the mouse, as in a spreadsheet: press in a cell and drag to another, or click
// a cell and shift-click another. Dragging inside one cell still selects text in it; the cell selection starts when the
// mouse enters a second cell. As in a spreadsheet, a selection has one active cell with the cursor (see focusCell): the
// cell where it started, and then the selected cell that is pressed. A click in a selected cell keeps the selection, so
// a search field or switch there changes all selected cells; a click elsewhere in the sheet, a click outside it, moving
// the cursor out of it with the keyboard, or Esc ends it. Only the given columns can be selected (the ID column cannot).
// See cellSelection.ts.
import { computed, onMounted, onUnmounted, ref, type Ref } from 'vue';
import {
  blockFields,
  blockRowUids,
  blockSize,
  inBlock,
  selectionBlock,
  type Cell,
  type CellSelection,
} from './cellSelection';
import { nextCell } from './cellNavigation';

/** focusCell gives a cell the cursor, and says whether it could (a calculated or locked cell cannot). */
export function useCellSelection(rowUids: Ref<string[]>, fields: Ref<string[]>, focusCell: (cell: Cell) => boolean) {
  const selection = ref<CellSelection | null>(null);
  const dragging = ref(false);
  let start: Cell | null = null; // the cell where the mouse button was pressed: dragging from it starts a selection

  const block = computed(() => selectionBlock(selection.value, rowUids.value, fields.value));
  // Only a block of more than one cell counts as a selection; one cell is where the next shift-click starts from.
  const active = computed(() => !!block.value && blockSize(block.value) > 1);
  const rows = computed(() => (active.value ? blockRowUids(block.value!, rowUids.value) : []));
  const columns = computed(() => (active.value ? blockFields(block.value!, fields.value) : []));

  // The cell at the bottom left of the selection: the line that explains the selection goes under it.
  const bottomLeft = computed<Cell | null>(() =>
    active.value ? { uid: rowUids.value[block.value!.rows[1]]!, field: fields.value[block.value!.columns[0]]! } : null,
  );

  const position = (cell: Cell) => [rowUids.value.indexOf(cell.uid), fields.value.indexOf(cell.field)] as const;
  const isSelected = (cell: Cell) => active.value && inBlock(block.value!, ...position(cell));

  // The classes of a selected cell: tinted, with a line along the edges of the block.
  function cellClasses(cell: Cell) {
    if (!isSelected(cell)) {
      return {};
    }
    const [row, column] = position(cell);
    const { rows: r, columns: c } = block.value!;
    return {
      'cell-selected': true,
      'edge-top': row === r[0],
      'edge-bottom': row === r[1],
      'edge-left': column === c[0],
      'edge-right': column === c[1],
    };
  }

  const selectable = (cell: Cell) => fields.value.includes(cell.field);

  function onCellMousedown(cell: Cell, event: MouseEvent) {
    if (event.button !== 0) {
      return;
    }
    if (!selectable(cell)) {
      clear();
      return;
    }
    if (event.shiftKey && selection.value) {
      event.preventDefault(); // no text selection and no focus change: the block grows to this cell
      selection.value = { ...selection.value, focus: cell };
      focusActiveCell();
      return;
    }
    start = cell;
    if (!isSelected(cell)) {
      selection.value = { anchor: cell, focus: cell };
    } else if (!(event.target as Element).closest(':is(input, textarea, button):enabled')) {
      // Pressed beside the field of a selected cell, or on a locked field: the cell gets the cursor, or (when it cannot
      // take it) the cursor stays where it is, instead of going nowhere.
      event.preventDefault();
      focusCell(cell);
    }
  }

  // The cursor in a cell outside the selection (moved there with the keyboard) ends the selection: a selection always
  // has the cursor in one of its cells.
  function onCellFocusin(cell: Cell) {
    if (active.value && !isSelected(cell)) {
      clear();
    }
  }

  // When a selection is made, the cell where it started gets the cursor or, when it cannot take it, the first selected
  // cell that can (none can when only calculated or locked cells are selected).
  function focusActiveCell() {
    const cells = rows.value.flatMap((uid) => columns.value.map((field) => ({ uid, field })));
    [selection.value!.anchor, ...cells].some((cell) => focusCell(cell));
  }

  function onCellMouseenter(cell: Cell, event: MouseEvent) {
    if (!start || !(event.buttons & 1) || !selectable(cell)) {
      return;
    }
    selection.value = { anchor: start, focus: cell };
    if (!dragging.value && blockSize(block.value!) > 1) {
      dragging.value = true;
      window.getSelection()?.removeAllRanges();
    }
  }

  const clear = () => {
    selection.value = null;
  };
  /**
   * Grows or shrinks the selection one cell in a direction (Shift+arrow), from its far corner; without a selection,
   * from the cell with the cursor. Returns the far corner, or null at the edge of the sheet.
   */
  function grow(cursor: Cell, direction: 'up' | 'down' | 'left' | 'right'): Cell | null {
    const { anchor, focus } = active.value ? selection.value! : { anchor: cursor, focus: cursor };
    const [row, column] = position(focus);
    const size = { rows: rowUids.value.length, columns: fields.value.length };
    const next = nextCell({ row, column }, direction, size, () => true);
    if (!next) {
      return null;
    }
    const corner = { uid: rowUids.value[next.row]!, field: fields.value[next.column]! };
    selection.value = { anchor, focus: corner };
    return corner;
  }

  /** Selects the block from one cell to another, such as the cells that were just pasted. */
  const select = (anchor: Cell, focus: Cell) => {
    selection.value = { anchor, focus };
  };

  const onMouseup = () => {
    if (dragging.value && selection.value) {
      focusActiveCell();
    }
    start = null;
    dragging.value = false;
  };
  // The list of a search field is shown outside the sheet (in the page body), but belongs to its cell; the line under the
  // selection (with its delete button) belongs to the selection. A press or the cursor anywhere else ends it.
  const onOutside = (event: Event) => {
    if (!(event.target as Element).closest?.('.fixed-table tbody, [role="listbox"], .selection-label')) {
      clear();
    }
  };
  const onKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      clear();
    }
  };
  onMounted(() => {
    window.addEventListener('mouseup', onMouseup);
    window.addEventListener('mousedown', onOutside, true);
    window.addEventListener('focusin', onOutside);
    window.addEventListener('keydown', onKeydown);
  });
  onUnmounted(() => {
    window.removeEventListener('mouseup', onMouseup);
    window.removeEventListener('mousedown', onOutside, true);
    window.removeEventListener('focusin', onOutside);
    window.removeEventListener('keydown', onKeydown);
  });

  return {
    rows,
    columns,
    bottomLeft,
    dragging,
    cellClasses,
    onCellMousedown,
    onCellMouseenter,
    onCellFocusin,
    clear,
    select,
    grow,
  };
}
