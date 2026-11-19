import { describe, expect, it } from 'vitest';
import { fillHeight, fillsWindow, keyScroll, wheelScroll } from '../windowFill';

describe('fillsWindow', () => {
  it('fills the window from 940px wide and 700px high, where the controls take one or two rows', () => {
    expect(fillsWindow(1440, 900)).toBe(true);
    expect(fillsWindow(940, 700)).toBe(true);
  });

  it('leaves the page scrolling in a narrower or lower window, such as a phone or a tablet', () => {
    expect(fillsWindow(939, 900)).toBe(false);
    expect(fillsWindow(1440, 699)).toBe(false);
    expect(fillsWindow(375, 812)).toBe(false);
  });
});

describe('fillHeight', () => {
  it('reaches from the top of the scroll area to 8px above the bottom of the window', () => {
    expect(fillHeight(900, 238)).toBe(654);
  });

  it('keeps at least 200px when there is hardly any room left', () => {
    expect(fillHeight(700, 650)).toBe(200);
  });
});

describe('wheelScroll', () => {
  const wheel = (deltaX: number, deltaY: number, deltaMode = 0, shiftKey = false) => ({
    deltaX,
    deltaY,
    deltaMode,
    shiftKey,
  });

  it('scrolls as far as the wheel or trackpad moved, in pixels', () => {
    expect(wheelScroll(wheel(0, 120), 600)).toEqual({ left: 0, top: 120 });
    expect(wheelScroll(wheel(-30, 10), 600)).toEqual({ left: -30, top: 10 });
  });

  it('turns lines into 16px and pages into the height of the scroll area', () => {
    expect(wheelScroll(wheel(0, 3, 1), 600)).toEqual({ left: 0, top: 48 });
    expect(wheelScroll(wheel(0, 1, 2), 600)).toEqual({ left: 0, top: 600 });
  });

  it('scrolls sideways with Shift and a wheel that only goes up and down', () => {
    expect(wheelScroll(wheel(0, 100, 0, true), 600)).toEqual({ left: 100, top: 0 });
  });
});

describe('keyScroll', () => {
  const area = { width: 1400, height: 600 };

  it('scrolls 40px with the arrows', () => {
    expect(keyScroll('ArrowDown', false, area)).toEqual({ left: 0, top: 40 });
    expect(keyScroll('ArrowUp', false, area)).toEqual({ left: 0, top: -40 });
    expect(keyScroll('ArrowRight', false, area)).toEqual({ left: 40, top: 0 });
    expect(keyScroll('ArrowLeft', false, area)).toEqual({ left: -40, top: 0 });
  });

  it('scrolls most of the height with Page Down, Page Up and the space bar (up with Shift)', () => {
    expect(keyScroll('PageDown', false, area)).toEqual({ left: 0, top: 540 });
    expect(keyScroll('PageUp', false, area)).toEqual({ left: 0, top: -540 });
    expect(keyScroll(' ', false, area)).toEqual({ left: 0, top: 540 });
    expect(keyScroll(' ', true, area)).toEqual({ left: 0, top: -540 });
  });

  it('goes to the top or the bottom with Home and End', () => {
    expect(keyScroll('Home', false, area)).toEqual({ left: 0, top: -Infinity });
    expect(keyScroll('End', false, area)).toEqual({ left: 0, top: Infinity });
  });

  it('leaves other keys alone', () => {
    expect(keyScroll('a', false, area)).toBeNull();
    expect(keyScroll('Enter', false, area)).toBeNull();
  });
});
