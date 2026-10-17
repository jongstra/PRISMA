import { describe, it, expect } from 'vitest';
import { suggestedItems } from '../selectionSearch';

const items = [{ name: 'APT28' }, { name: 'APT29' }, { name: 'Lazarus Group', selected: true }, { name: 'FIN7' }];
const isSelected = (item: { selected?: boolean }) => !!item.selected;

describe('suggestedItems', () => {
  it('suggests every item that is not selected yet while nothing is typed', () => {
    expect(suggestedItems(items, '', isSelected).map((item) => item.name)).toEqual(['APT28', 'APT29', 'FIN7']);
  });

  it('narrows the suggestions to the names with the typed text, ignoring case', () => {
    expect(suggestedItems(items, 'apt', isSelected).map((item) => item.name)).toEqual(['APT28', 'APT29']);
    expect(suggestedItems(items, 'group', isSelected)).toEqual([]);
  });
});
