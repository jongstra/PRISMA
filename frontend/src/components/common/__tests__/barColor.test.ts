import { describe, it, expect } from 'vitest';
import { barColor } from '../barColor';

describe('barColor', () => {
  it('goes from red at 0% through olive at 50% to green at 100%', () => {
    expect(barColor(0)).toBe('rgb(255, 0, 0)');
    expect(barColor(50)).toBe('rgb(127.5, 127.5, 0)');
    expect(barColor(100)).toBe('rgb(0, 255, 0)');
  });

  it('stays red or green outside 0-100%', () => {
    expect(barColor(-10)).toBe('rgb(255, 0, 0)');
    expect(barColor(120)).toBe('rgb(0, 255, 0)');
  });
});
