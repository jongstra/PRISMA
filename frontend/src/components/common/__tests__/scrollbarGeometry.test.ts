import { describe, it, expect } from 'vitest';
import { scrollTopForDrag, thumbGeometry } from '../scrollbarGeometry';

describe('thumbGeometry', () => {
  it('shows no bar when the page is not taller than the window', () => {
    expect(thumbGeometry(900, 900, 0)).toEqual({ visible: false, top: 0, height: 0 });
  });

  it('makes the bar as much shorter than the window as the window is shorter than the page', () => {
    expect(thumbGeometry(900, 1800, 0)).toEqual({ visible: true, top: 0, height: 450 });
  });

  it('moves the bar from the top to the bottom of the window while the page scrolls', () => {
    expect(thumbGeometry(900, 1800, 450).top).toBe(225);
    expect(thumbGeometry(900, 1800, 900).top).toBe(450);
  });

  it('keeps a long page’s bar big enough to grab, and inside the window when the page bounces past its ends', () => {
    expect(thumbGeometry(900, 90000, 0).height).toBe(30);
    expect(thumbGeometry(900, 90000, 99999).top).toBe(870);
    expect(thumbGeometry(900, 1800, -50).top).toBe(0);
  });
});

describe('scrollTopForDrag', () => {
  it('scrolls the page as far as the bar is dragged, scaled to the page', () => {
    expect(scrollTopForDrag(900, 1800, 0, 225)).toBe(450);
  });

  it('stops at the top and the bottom of the page', () => {
    expect(scrollTopForDrag(900, 1800, 100, -500)).toBe(0);
    expect(scrollTopForDrag(900, 1800, 800, 500)).toBe(900);
  });
});
