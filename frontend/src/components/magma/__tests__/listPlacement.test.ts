import { describe, it, expect } from 'vitest';
import { listPlacement } from '../listPlacement';

describe('listPlacement', () => {
  const window = { width: 1400, height: 900 };

  it('opens below the field when there is room', () => {
    expect(listPlacement({ left: 100, top: 200, width: 170, height: 50 }, 600, window)).toEqual({
      left: 100,
      top: 250,
      width: 420,
      maxHeight: 300,
    });
  });

  it('opens above the field near the bottom of the window', () => {
    expect(listPlacement({ left: 100, top: 780, width: 170, height: 50 }, 600, window)).toEqual({
      left: 100,
      top: 480,
      width: 420,
      maxHeight: 300,
    });
  });

  it('stays below for a short list that fits', () => {
    expect(listPlacement({ left: 100, top: 780, width: 170, height: 50 }, 40, window).top).toBe(830);
  });

  it('stays inside the window on the right', () => {
    expect(listPlacement({ left: 1300, top: 200, width: 90, height: 50 }, 600, window).left).toBe(972);
  });
});
