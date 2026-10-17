import { describe, it, expect } from 'vitest';
import { barWidth } from '../barWidth';

describe('barWidth', () => {
  it('scales a value relative to the maximum, so the largest bar fills the track', () => {
    expect(barWidth(50, 200)).toBe('25%');
    expect(barWidth(200, 200)).toBe('100%');
  });

  it('never exceeds the track, whatever the data', () => {
    expect(barWidth(538, 100)).toBe('100%');
    expect(barWidth(-5, 100)).toBe('0%');
  });

  it('handles empty charts and missing values', () => {
    expect(barWidth(0, 0)).toBe('0%');
    expect(barWidth(NaN, 100)).toBe('0%');
  });
});
