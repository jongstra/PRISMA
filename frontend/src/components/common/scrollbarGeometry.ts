// The size and position of the page's scroll bar (PageScrollbar.vue), and how far dragging it scrolls the page.

const MIN_HEIGHT = 30; // pixels: the bar of a very long page stays big enough to grab

export interface ThumbGeometry {
  visible: boolean;
  top: number;
  height: number;
}

/**
 * The bar for a window of `viewport` pixels high on a page of `content` pixels, scrolled `scrollTop` pixels down: as
 * much shorter than the window as the window is shorter than the page, and as far down as the page is scrolled. No bar
 * when the page is not taller than the window.
 */
export function thumbGeometry(viewport: number, content: number, scrollTop: number): ThumbGeometry {
  if (content <= viewport + 1) {
    return { visible: false, top: 0, height: 0 };
  }
  const height = Math.max(MIN_HEIGHT, (viewport * viewport) / content);
  const maxScroll = content - viewport;
  const scrolled = Math.min(Math.max(scrollTop, 0), maxScroll);
  return { visible: true, top: (scrolled / maxScroll) * (viewport - height), height };
}

/** Where the page is scrolled when the bar is dragged `deltaY` pixels from where it was at `startScrollTop`. */
export function scrollTopForDrag(viewport: number, content: number, startScrollTop: number, deltaY: number): number {
  const { height } = thumbGeometry(viewport, content, startScrollTop);
  const maxScroll = content - viewport;
  return Math.min(Math.max(startScrollTop + (deltaY * maxScroll) / (viewport - height), 0), maxScroll);
}
