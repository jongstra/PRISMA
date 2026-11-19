// Selecting a block of cells in a sheet with the mouse, as in a spreadsheet: press in a cell and drag to another, or click
// a cell and shift-click another. Dragging inside one cell still selects text in it; the cell selection starts when the
// mouse enters a second cell. When the selection is made, the cell where it started gets the cursor (focusCell), as in a
// spreadsheet. A click in a selected cell keeps the selection, so a search field or switch there changes all selected
// cells; a click elsewhere in the sheet, a click outside it or Esc ends it. Only the given columns can be selected (the
// ID column cannot). See cellSelection.ts.
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

export function useCellSelection(rowUids: Ref<string[]>, fields: Ref<string[]>, focusCell: (cell: Cell) => void) {
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
      focusCell(selection.value.anchor);
      return;
    }
    start = cell;
    if (!isSelected(cell)) {
      selection.value = { anchor: cell, focus: cell };
    }
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

  const onMouseup = () => {
    if (dragging.value && selection.value) {
      focusCell(selection.value.anchor);
    }
    start = null;
    dragging.value = false;
  };
  // The list of a search field is shown outside the sheet (in the page body), but belongs to its cell.
  const onMousedownOutside = (event: MouseEvent) => {
    if (!(event.target as Element).closest?.('.fixed-table tbody, [role="listbox"]')) {
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
    window.addEventListener('mousedown', onMousedownOutside, true);
    window.addEventListener('keydown', onKeydown);
  });
  onUnmounted(() => {
    window.removeEventListener('mouseup', onMouseup);
    window.removeEventListener('mousedown', onMousedownOutside, true);
    window.removeEventListener('keydown', onKeydown);
  });

  return { rows, columns, bottomLeft, dragging, cellClasses, onCellMousedown, onCellMouseenter, clear };
}
