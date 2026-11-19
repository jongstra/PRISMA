// A scroll area that fills the window (useScrollArea.ts): the ATT&CK matrix on the DeTT&CT page and the MaGMa heatmap.
// In a window that is wide and high enough, the page itself stops scrolling: the header and the controls stay in view,
// and the scroll area fills the rest of the window and scrolls itself. In a narrower or lower window (a phone, a tablet)
// the controls take too much room, so the page scrolls as before.

export const FILL_MIN_WIDTH = 940; // below this the controls go in more rows (see Heatmap.vue and SheetTabs.vue)
export const FILL_MIN_HEIGHT = 700;
const BOTTOM_GAP = 8; // pixels free below the scroll area, like the 0.5rem at the sides of the page
const MIN_HEIGHT = 200;
const LINE = 16; // pixels per line, for a wheel that scrolls by lines
const ARROW_STEP = 40;
const PAGE_PART = 0.9; // Page Down scrolls this part of the height, so the last bit stays in view

export interface ScrollStep {
  left: number;
  top: number;
}

/** Whether a window of this size fills it with the scroll area (and stops the page from scrolling). */
export function fillsWindow(width: number, height: number): boolean {
  return width >= FILL_MIN_WIDTH && height >= FILL_MIN_HEIGHT;
}

/** The height of a scroll area whose top is `top` pixels from the top of a window `windowHeight` pixels high. */
export function fillHeight(windowHeight: number, top: number): number {
  return Math.max(MIN_HEIGHT, Math.round(windowHeight - top - BOTTOM_GAP));
}

/**
 * How far a turn of the wheel (or a swipe on a trackpad) scrolls the area, in pixels: a wheel that counts in lines or
 * pages is turned into pixels, and Shift with a wheel that only goes up and down scrolls sideways, as browsers do.
 */
export function wheelScroll(
  wheel: { deltaX: number; deltaY: number; deltaMode: number; shiftKey: boolean },
  areaHeight: number,
): ScrollStep {
  const unit = wheel.deltaMode === 1 ? LINE : wheel.deltaMode === 2 ? areaHeight : 1;
  if (wheel.shiftKey && wheel.deltaX === 0) {
    return { left: wheel.deltaY * unit, top: 0 };
  }
  return { left: wheel.deltaX * unit, top: wheel.deltaY * unit };
}

/** How far a key scrolls the area, as it would scroll the page; null for a key that does not scroll. */
export function keyScroll(key: string, shiftKey: boolean, area: { width: number; height: number }): ScrollStep | null {
  const page = Math.round(area.height * PAGE_PART);
  switch (key) {
    case 'ArrowDown':
      return { left: 0, top: ARROW_STEP };
    case 'ArrowUp':
      return { left: 0, top: -ARROW_STEP };
    case 'ArrowRight':
      return { left: ARROW_STEP, top: 0 };
    case 'ArrowLeft':
      return { left: -ARROW_STEP, top: 0 };
    case 'PageDown':
      return { left: 0, top: page };
    case 'PageUp':
      return { left: 0, top: -page };
    case ' ':
      return { left: 0, top: shiftKey ? -page : page };
    case 'Home':
      return { left: 0, top: -Infinity };
    case 'End':
      return { left: 0, top: Infinity };
    default:
      return null;
  }
}
