import { describe, it, expect } from 'vitest';
import { filterSummary, occurrenceLevel, visibilityRangeText } from '../controlValues';

describe('visibilityRangeText', () => {
  it('shows the selected range in whole percentages', () => {
    expect(visibilityRangeText(0, 1)).toBe('0 – 100');
    expect(visibilityRangeText(0.2, 0.755)).toBe('20 – 76');
  });
});

describe('occurrenceLevel', () => {
  it('names the four levels of the minimum total occurrence slider', () => {
    expect([0, 1, 2, 3].map(occurrenceLevel)).toEqual(['Low', 'Medium', 'High', 'Very High']);
  });
});

describe('filterSummary', () => {
  it('says how many of the items the filter lets through', () => {
    expect(filterSummary(11, 11, 'platforms')).toBe('All platforms');
    expect(filterSummary(3, 11, 'platforms')).toBe('3 of 11 platforms');
    expect(filterSummary(0, 11, 'platforms')).toBe('No platforms');
  });
});
