// Sorting the rows of the L1, L2 and L3 sheets by one column. Sorting only changes the order on the screen; the use cases,
// and so the saved file, keep their own order.

export type SortDirection = 'ascending' | 'descending';

/** The column a sheet is sorted by, and in which direction. */
export interface SheetSort {
  field: string;
  direction: SortDirection;
}

/** A value to sort by: a number (also as text, such as '45.00'), text, a switch, or nothing. */
export type SortValue = number | string | boolean | null | undefined;

const isEmpty = (value: SortValue) =>
  value === null || value === undefined || (typeof value === 'string' && value.trim() === '') || Number.isNaN(value);

// A number, or a text that is a number; otherwise null.
function asNumber(value: SortValue): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

// Compares two values that are not empty: switches off before on, numbers before text, numbers as numbers, and text
// ignoring capitals with the numbers in it in their natural order (L3-2 before L3-10).
function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'boolean' || typeof b === 'boolean') return Number(a === true) - Number(b === true);
  const numberA = asNumber(a);
  const numberB = asNumber(b);
  if (numberA !== null && numberB !== null) return numberA - numberB;
  if (numberA !== null) return -1;
  if (numberB !== null) return 1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' });
}

/**
 * The rows in the order of the sort: pinned rows first (in their own order), then the others by their value, with empty
 * values last in both directions and equal values in their own order. Without a sort, the rows stay as they are.
 */
export function sortedRows<T>(
  rows: T[],
  sort: SheetSort | null,
  valueOf: (row: T) => SortValue,
  pinned: (row: T) => boolean = () => false,
): T[] {
  if (!sort) return rows;
  const sign = sort.direction === 'ascending' ? 1 : -1;
  const sortable = rows
    .filter((row) => !pinned(row))
    .map((row, index) => ({ row, index, value: valueOf(row) }))
    .sort((a, b) => {
      const emptyA = isEmpty(a.value);
      const emptyB = isEmpty(b.value);
      if (emptyA || emptyB) return emptyA === emptyB ? a.index - b.index : emptyA ? 1 : -1;
      return sign * compare(a.value, b.value) || a.index - b.index;
    });
  return [...rows.filter(pinned), ...sortable.map(({ row }) => row)];
}

/** The sort after a click on a column header: ascending, then descending, then no sort; another column starts ascending. */
export function nextSort(current: SheetSort | null, field: string): SheetSort | null {
  if (current?.field !== field) return { field, direction: 'ascending' };
  return current.direction === 'ascending' ? { field, direction: 'descending' } : null;
}
