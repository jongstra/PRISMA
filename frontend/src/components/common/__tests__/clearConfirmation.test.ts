import { describe, expect, it } from 'vitest';
import { clearConfirmation } from '../clearConfirmation';

describe('clearConfirmation', () => {
  it('does not ask for nothing or for a single item: that clears at once, as clicking its chip does', () => {
    expect(clearConfirmation(0, 'group')).toBeNull();
    expect(clearConfirmation(1, 'group')).toBeNull();
  });

  it('asks about both items when there are two', () => {
    expect(clearConfirmation(2, 'group')).toBe('Clear both groups?');
  });

  it('asks about all of them, with their number, when there are more', () => {
    expect(clearConfirmation(4, 'group')).toBe('Clear all 4 groups?');
    expect(clearConfirmation(7, 'component')).toBe('Clear all 7 components?');
  });
});
