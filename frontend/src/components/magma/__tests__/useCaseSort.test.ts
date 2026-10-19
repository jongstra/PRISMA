import { describe, it, expect } from 'vitest';
import { nextSort, sortedRows, type SortValue } from '../useCaseSort';

type Row = { id: string; value: SortValue; pinned?: boolean };
const ids = (rows: Row[]) => rows.map((row) => row.id);
const valueOf = (row: Row) => row.value;

describe('sortedRows', () => {
  it('sorts numbers as numbers, also when they are text such as "45.00"', () => {
    const rows: Row[] = [
      { id: 'a', value: '45.00' },
      { id: 'b', value: 9 },
      { id: 'c', value: 100 },
    ];
    expect(ids(sortedRows(rows, { field: 'value', direction: 'ascending' }, valueOf))).toEqual(['b', 'a', 'c']);
    expect(ids(sortedRows(rows, { field: 'value', direction: 'descending' }, valueOf))).toEqual(['c', 'a', 'b']);
  });

  it('sorts text ignoring capitals, with numbers in their natural order', () => {
    const rows: Row[] = [
      { id: '1', value: 'L3-10' },
      { id: '2', value: 'l3-2' },
      { id: '3', value: 'DOS-1' },
    ];
    expect(ids(sortedRows(rows, { field: 'value', direction: 'ascending' }, valueOf))).toEqual(['3', '2', '1']);
  });

  it('puts empty values last in both directions, and keeps the order of equal values', () => {
    const rows: Row[] = [
      { id: 'empty', value: '' },
      { id: 'one', value: 1 },
      { id: 'missing', value: null },
      { id: 'also one', value: 1 },
    ];
    expect(ids(sortedRows(rows, { field: 'value', direction: 'ascending' }, valueOf))).toEqual([
      'one',
      'also one',
      'empty',
      'missing',
    ]);
    expect(ids(sortedRows(rows, { field: 'value', direction: 'descending' }, valueOf))).toEqual([
      'one',
      'also one',
      'empty',
      'missing',
    ]);
  });

  it('sorts switches off before on', () => {
    const rows: Row[] = [
      { id: 'on', value: true },
      { id: 'off', value: false },
    ];
    expect(ids(sortedRows(rows, { field: 'value', direction: 'ascending' }, valueOf))).toEqual(['off', 'on']);
  });

  it('keeps pinned rows on top in their own order, and leaves the rows as they are without a sort', () => {
    const rows: Row[] = [
      { id: 'b', value: 2 },
      { id: 'IN', value: 9, pinned: true },
      { id: 'a', value: 1 },
      { id: 'THR', value: 0, pinned: true },
    ];
    const pinned = (row: Row) => !!row.pinned;
    expect(ids(sortedRows(rows, { field: 'value', direction: 'ascending' }, valueOf, pinned))).toEqual([
      'IN',
      'THR',
      'a',
      'b',
    ]);
    expect(ids(sortedRows(rows, null, valueOf, pinned))).toEqual(['b', 'IN', 'a', 'THR']);
  });
});

describe('nextSort', () => {
  it('goes from ascending to descending to no sort on the same column, and starts ascending on another', () => {
    const ascending = nextSort(null, 'risk');
    expect(ascending).toEqual({ field: 'risk', direction: 'ascending' });
    const descending = nextSort(ascending, 'risk');
    expect(descending).toEqual({ field: 'risk', direction: 'descending' });
    expect(nextSort(descending, 'risk')).toBeNull();
    expect(nextSort(descending, 'name')).toEqual({ field: 'name', direction: 'ascending' });
  });
});
